/**
 * Khởi tạo database trống khi triển khai (chạy trong `vercel-build`, an toàn để chạy lặp lại).
 *  - Luôn bảo đảm có các loại hoạt động mặc định (chỉ tạo khi bảng trống).
 *  - Nếu CHƯA có người dùng nào:
 *      SEED_DEMO=true  -> nạp dữ liệu demo (giống local)
 *      ngược lại       -> chỉ tạo 1 tài khoản admin
 *  - Nếu đã có người dùng: không làm gì, không bao giờ xóa dữ liệu.
 *
 * Biến môi trường: ADMIN_USERNAME (mặc định "admin"), ADMIN_INITIAL_PASSWORD (nếu bỏ trống sẽ sinh ngẫu nhiên và in ra log build 1 lần).
 */
import { PrismaClient } from "@prisma/client";
import { generateTempPassword, hashPassword } from "../src/lib/auth/password";
import { seedDemo } from "./seed";

// Dùng cùng chuỗi kết nối với ứng dụng: ưu tiên DATABASE_POOLED_URL (ghi đè DATABASE_URL do tích hợp quản lý)
const db = new PrismaClient({ datasourceUrl: process.env.DATABASE_POOLED_URL || process.env.DATABASE_URL });

const CATEGORIES = [["Tình nguyện", 10], ["Học tập", 5], ["Văn hóa", 5], ["Thể thao", 5], ["Hoạt động Đoàn", 3]] as const;

async function main() {
  // Bảo đảm luôn có ít nhất một Quản trị hệ thống (tài khoản ADMIN cũ nhất) – an toàn khi chạy lặp lại.
  if ((await db.user.count({ where: { role: "ADMIN", superAdmin: true } })) === 0) {
    const first = await db.user.findFirst({ where: { role: "ADMIN" }, orderBy: { createdAt: "asc" } });
    if (first) await db.user.update({ where: { id: first.id }, data: { superAdmin: true } });
  }
  if ((await db.user.count()) > 0) {
    console.log("[bootstrap] Database đã có dữ liệu – bỏ qua.");
    return;
  }
  if (process.env.SEED_DEMO === "true") {
    console.log("[bootstrap] Database trống + SEED_DEMO=true -> nạp dữ liệu DEMO.");
    await seedDemo();
    return;
  }
  if ((await db.activityCategory.count()) === 0) {
    await db.activityCategory.createMany({ data: CATEGORIES.map(([name, defaultPoints]) => ({ name, defaultPoints })) });
  }
  const username = process.env.ADMIN_USERNAME || "admin";
  const generated = !process.env.ADMIN_INITIAL_PASSWORD;
  const password = process.env.ADMIN_INITIAL_PASSWORD || generateTempPassword(14);
  await db.user.create({
    data: { username, fullName: "Quản trị viên", role: "ADMIN", superAdmin: true, passwordHash: await hashPassword(password), mustChangePassword: true },
  });
  console.log(`[bootstrap] Đã tạo admin "${username}" (bắt buộc đổi mật khẩu khi đăng nhập lần đầu).`);
  if (generated) console.log(`[bootstrap] Mật khẩu tạm thời: ${password}   <- ghi lại ngay, chỉ hiện một lần`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
