"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { run, UserError } from "@/lib/action";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth/session";
import { generateTempPassword, hashPassword } from "@/lib/auth/password";
import { personName } from "@/lib/validation/rules";
import { ForbiddenError } from "@/lib/permissions";

/** Chỉ quản trị tối cao (Admin hệ thống) được cấp, sửa, khóa tài khoản Ban chấp hành Đoàn trường. */
async function requireSuperAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN" || !user.superAdmin) throw new ForbiddenError("Chỉ Quản trị hệ thống mới được quản lý tài khoản Ban chấp hành");
  return user;
}

const leaderSchema = z.object({
  fullName: personName("họ tên"),
  username: z.string().trim().min(3, "Tên đăng nhập tối thiểu 3 ký tự").max(40).regex(/^[a-zA-Z0-9._-]+$/, "Chỉ gồm chữ, số, . _ -"),
  position: z.string().trim().min(2, "Chọn hoặc nhập chức danh").max(60),
});

export async function createLeaderAction(input: unknown) {
  return run<{ username: string; password: string }>(async () => {
    const admin = await requireSuperAdmin();
    const d = leaderSchema.parse(input);
    if (await db.user.findUnique({ where: { username: d.username } })) throw new UserError("Tên đăng nhập đã tồn tại");
    const password = generateTempPassword();
    const u = await db.user.create({
      data: { username: d.username, fullName: d.fullName, position: d.position, role: "ADMIN", superAdmin: false, passwordHash: await hashPassword(password), mustChangePassword: true },
    });
    await audit(admin.id, "leader.create", "User", u.id, { username: u.username, position: d.position });
    revalidatePath("/settings");
    return { data: { username: u.username, password }, message: "Đã cấp tài khoản Ban chấp hành" };
  });
}

async function getLeader(id: string) {
  const u = await db.user.findUnique({ where: { id } });
  if (!u || u.role !== "ADMIN" || u.superAdmin) throw new UserError("Không tìm thấy tài khoản Ban chấp hành");
  return u;
}

export async function updateLeaderAction(id: string, input: unknown) {
  return run(async () => {
    const admin = await requireSuperAdmin();
    const d = leaderSchema.pick({ fullName: true, position: true }).parse(input);
    await getLeader(id);
    await db.user.update({ where: { id }, data: { fullName: d.fullName, position: d.position } });
    await audit(admin.id, "leader.update", "User", id, d);
    revalidatePath("/settings");
    return { message: "Đã cập nhật" };
  });
}

export async function resetLeaderPasswordAction(id: string) {
  return run<{ password: string }>(async () => {
    const admin = await requireSuperAdmin();
    await getLeader(id);
    const password = generateTempPassword();
    await db.$transaction([
      db.user.update({ where: { id }, data: { passwordHash: await hashPassword(password), mustChangePassword: true } }),
      db.passkey.deleteMany({ where: { userId: id } }),
    ]);
    await audit(admin.id, "leader.reset_password", "User", id);
    return { data: { password }, message: "Đã cấp lại mật khẩu tạm thời" };
  });
}

/** Thu hồi (khóa) hoặc cấp lại (mở khóa) quyền Ban chấp hành. Khóa có hiệu lực ngay; dữ liệu và lịch sử thao tác được giữ nguyên. */
export async function setLeaderStatusAction(id: string, status: "ACTIVE" | "LOCKED") {
  return run(async () => {
    const admin = await requireSuperAdmin();
    await getLeader(id);
    await db.user.update({ where: { id }, data: { status } });
    await audit(admin.id, status === "LOCKED" ? "leader.revoke" : "leader.restore", "User", id);
    revalidatePath("/settings");
    return { message: status === "LOCKED" ? "Đã thu hồi tài khoản" : "Đã cấp lại quyền" };
  });
}
