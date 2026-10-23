import { Puzzle, BookOpen, Bell, CalendarRange, Database, Fingerprint, FolderCog, Globe, Menu, KeyRound, ListChecks, Megaphone, ShieldCheck, UserRound, type LucideIcon } from "lucide-react";
import type { SessionUser } from "@/lib/auth/session";
import { SettingsNav, type SettingsGroup } from "./settings-nav";

const ic = (I: LucideIcon) => <I className="size-4" />;

/** Các nhóm của Cài đặt. Phần quản trị chỉ Admin thấy; mục có href là trang quản lý riêng nhưng vẫn mở bên phải cột Cài đặt. */
export function settingsGroups(user: Pick<SessionUser, "role" | "superAdmin">): SettingsGroup[] {
  const admin = user.role === "ADMIN";
  return [
    { title: "Cá nhân", items: [
      { key: "account", label: "Tài khoản", icon: ic(UserRound) }, { key: "notifications", label: "Thông báo", icon: ic(Bell) },
      { key: "password", label: "Mật khẩu", icon: ic(KeyRound) }, { key: "passkey", label: "Đăng nhập nhanh", icon: ic(Fingerprint) },
    ] },
    ...(admin ? [
      { title: "Tổ chức", items: [
        { key: "schoolyear", label: "Năm học và lịch tuần", icon: ic(CalendarRange) },
        { key: "classpw", label: "Cấp lại mật khẩu theo lớp", icon: ic(KeyRound) },
        ...(user.superAdmin ? [{ key: "leaders", label: "Ban chấp hành", icon: ic(ShieldCheck) }] : []),
      ] },
      { title: "Danh mục", items: [
        { key: "plancats", label: "Danh mục kế hoạch", icon: ic(FolderCog) },
      ] },
      { title: "Thi đua và trò chơi", items: [
        { key: "gamecap", label: "Trần điểm trò chơi", icon: ic(Puzzle) },
      ] },
      { title: "Cổng thông tin", items: [
        { href: "/cms/settings", label: "Thông tin website", icon: ic(Globe) }, { href: "/cms/menu", label: "Menu website", icon: ic(Menu) }, { href: "/cms/marquee", label: "Dòng chữ chạy", icon: ic(Megaphone) }, { href: "/cms/pages", label: "Trang giới thiệu", icon: ic(BookOpen) },
      ] },
      { title: "Hệ thống", items: [
        { key: "data", label: "Dữ liệu và dung lượng", icon: ic(Database) },
      ] },
    ] : []),
  ];
}

/** Khung có cột Cài đặt bên trái, nội dung bên phải. Dùng cho trang Cài đặt và các trang quản lý được lối tắt từ Cài đặt. */
export function SettingsShell({ user, children }: { user: Pick<SessionUser, "role" | "superAdmin">; children: React.ReactNode }) {
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[230px_minmax(0,1fr)]">
      <SettingsNav groups={settingsGroups(user)} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
