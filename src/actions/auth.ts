"use server";

import { revalidatePath } from "next/cache";
import { invalidatePublic } from "@/lib/public-cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { run, UserError } from "@/lib/action";
import { audit, getRequestMeta } from "@/lib/audit";
import { createSession, destroySession, requireUser } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { changePasswordSchema, loginSchema } from "@/lib/validation";

// Giới hạn đăng nhập sai (bộ nhớ tiến trình; đủ cho một instance, thay bằng Redis khi scale).
const attempts = new Map<string, { count: number; first: number }>();
const WINDOW_MS = 15 * 60_000;
const MAX_ATTEMPTS = 8;

function throttleKey(username: string, ip: string | null) {
  return `${username.toLowerCase()}|${ip ?? "?"}`;
}
function checkThrottle(key: string) {
  const e = attempts.get(key);
  if (e && Date.now() - e.first > WINDOW_MS) attempts.delete(key);
  const cur = attempts.get(key);
  if (cur && cur.count >= MAX_ATTEMPTS) throw new UserError("Đăng nhập sai quá nhiều lần, vui lòng thử lại sau 15 phút");
}
function recordFailure(key: string) {
  const cur = attempts.get(key);
  if (!cur) attempts.set(key, { count: 1, first: Date.now() });
  else cur.count++;
}

export async function loginAction(input: unknown) {
  return run(async () => {
    const { username, password } = loginSchema.parse(input);
    const { ip } = await getRequestMeta();
    const key = throttleKey(username, ip);
    checkThrottle(key);

    // Lỗi cấu hình triển khai: báo rõ để quản trị khắc phục (không lộ giá trị bí mật).
    if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) {
      console.error("[login] AUTH_SECRET chưa cấu hình hoặc quá ngắn");
      throw new UserError("Máy chủ chưa cấu hình AUTH_SECRET (tối thiểu 32 ký tự). Liên hệ quản trị viên.");
    }
    // Đăng nhập bằng tên đăng nhập hoặc mã đoàn viên (bí thư cũ có tên đăng nhập riêng nhưng vẫn có mã đoàn viên).
    const user = await db.user.findFirst({ where: { OR: [{ username }, { member: { is: { code: username.toUpperCase() } } }] } }).catch((e) => {
      console.error("[login] Không truy vấn được database", e);
      throw new UserError("Không kết nối được cơ sở dữ liệu. Kiểm tra biến DATABASE_URL trên máy chủ.");
    });
    // So sánh hash cả khi không có user để giảm lộ thông tin qua thời gian phản hồi.
    const ok = await verifyPassword(password, user?.passwordHash ?? "$2b$11$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv");
    if (!user || !ok) {
      recordFailure(key);
      throw new UserError("Tên đăng nhập hoặc mật khẩu không đúng");
    }
    if (user.status !== "ACTIVE") throw new UserError("Tài khoản đã bị khóa. Vui lòng liên hệ Ban chấp hành Đoàn trường");

    attempts.delete(key);
    await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await createSession(user.id);
    await audit(user.id, "auth.login", "User", user.id);
    return { data: { mustChangePassword: user.mustChangePassword } };
  });
}

export async function logoutAction() {
  await destroySession();
  redirect("/"); // đăng xuất xong về trang chủ công khai
}

export async function changePasswordAction(input: unknown) {
  return run(async () => {
    const user = await requireUser({ allowPasswordChange: true });
    const data = changePasswordSchema.parse(input);
    const record = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    if (!(await verifyPassword(data.currentPassword, record.passwordHash))) {
      throw new UserError("Mật khẩu hiện tại không đúng");
    }
    await db.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(data.newPassword), mustChangePassword: false },
    });
    await audit(user.id, "auth.change_password", "User", user.id);
    return { message: "Đã đổi mật khẩu" };
  });
}

/** Quản trị viên tự đổi họ tên hiển thị (đoàn viên/bí thư do Admin quản lý hồ sơ). */
export async function updateOwnNameAction(input: { fullName: string }) {
  return run(async () => {
    const user = await requireUser();
    if (user.role !== "ADMIN") throw new UserError("Chỉ quản trị viên được tự đổi họ tên");
    const fullName = input.fullName.trim().replace(/\s+/g, " ");
    if (fullName.length < 2 || fullName.length > 100) throw new UserError("Họ tên từ 2 đến 100 ký tự");
    await db.user.update({ where: { id: user.id }, data: { fullName } });
    await audit(user.id, "account.rename", "User", user.id);
    invalidatePublic();
    return { message: "Đã cập nhật họ tên" };
  });
}
