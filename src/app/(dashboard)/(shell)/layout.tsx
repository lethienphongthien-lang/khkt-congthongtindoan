import { getCurrentUser } from "@/lib/auth/session";
import { SettingsShell } from "@/components/settings/settings-shell";

/**
 * Khung chung cho Cài đặt và các trang quản lý được lối tắt từ Cài đặt (Huy hiệu, Trò chơi, Thông tin website...).
 * Admin: cột Cài đặt bên trái luôn giữ nguyên, chỉ phần bên phải đổi khi chuyển mục (không dựng lại cả trang).
 * Người khác (đoàn viên, bí thư vào Thành tích...): không có cột.
 */
export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return <>{children}</>;
  return <SettingsShell user={user}>{children}</SettingsShell>;
}
