import { MessagesSquare, FileText, Globe, Settings, Award, BarChart3, CalendarDays, CheckSquare, IdCard, LayoutDashboard, Newspaper, QrCode, Trophy, School, History, Users, Vote, MessageSquare, Inbox, ClipboardList, Bell, BookOpen, Megaphone, HeartHandshake, Gamepad2, Compass, Puzzle, ScrollText, type LucideIcon } from "lucide-react";
import type { Role } from "@prisma/client";

export type NavItem = { /** Đứng ngay sau mục Cài đặt (thanh bên máy tính), cuối danh sách. */ footer?: boolean; href: string; label: string; icon: LucideIcon; /** Tiền tố đường dẫn coi là đang ở mục này (mặc định = href). */ match?: string; /** Menu con (hiển thị dạng nhóm mở/đóng). */ children?: { href: string; label: string; icon?: LucideIcon }[]; /** Nhóm mở sẵn (mặc định: chỉ mở khi đang ở một mục bên trong). */ open?: boolean };

export function navFor(role: Role): NavItem[] {
  if (role === "MEMBER") {
    return [
      { href: "/dashboard", label: "Tổng quan", icon: LayoutDashboard },
      { href: "/profile", label: "Hồ sơ & thẻ số", icon: IdCard },
      { href: "/emulation", label: "Thi đua", icon: Trophy },
      { href: "/games", label: "Trò chơi", icon: Gamepad2 },
    ];
  }
  if (role === "SECRETARY") {
    // Bí thư: chỉ phạm vi Chi đoàn của mình -> không có quản lý Chi đoàn / Báo cáo toàn trường.
    return [
      { href: "/dashboard", label: "Tổng quan", icon: LayoutDashboard },
      { href: "/members", label: "Đoàn viên & thanh niên", icon: Users },
      { href: "/volunteer", label: "Tình nguyện", icon: HeartHandshake },
      { href: "/emulation", label: "Thi đua", icon: Trophy },
      { href: "/games", label: "Trò chơi", icon: Gamepad2 },
      { href: "/chapter-reports", label: "Báo cáo Chi đoàn", icon: FileText },
      { href: "/team-chat", label: "Kênh chat", icon: MessagesSquare },
      // Bí thư cũng là đoàn viên: có hồ sơ, quét QR, lịch sử như đoàn viên
      { href: "/profile", label: "Hồ sơ & thẻ số", icon: IdCard },
      {
        href: "/cms/tin-tuc", label: "Cổng thông tin", icon: Globe, match: "/cms",
        children: [
          { href: "/cms/tin-tuc", label: "Tin tức", icon: Newspaper },
          { href: "/cms/ke-hoach", label: "Kế hoạch", icon: ClipboardList },
          { href: "/cms/thong-bao", label: "Thông báo", icon: Bell },
          { href: "/cms/dien-dan", label: "Diễn đàn", icon: MessageSquare },
          { href: "/cms/cau-chuyen-dep", label: "Câu chuyện đẹp", icon: HeartHandshake },
        ],
      },
    ];
  }
  // Admin: gom nhóm cho gọn (nhóm tự mở khi đang ở một mục bên trong; "Cổng thông tin" luôn mở sẵn)
  return [
    { href: "/dashboard", label: "Tổng quan", icon: LayoutDashboard },
    { href: "/approvals", label: "Hàng chờ duyệt", icon: Inbox },
    { href: "/members", label: "Tổ chức", icon: Users, children: [{ href: "/members", label: "Đoàn viên & thanh niên", icon: Users }, { href: "/departments", label: "Chi đoàn", icon: School }] },
    {
      href: "/volunteer", label: "Tình nguyện & lịch", icon: HeartHandshake,
      children: [{ href: "/volunteer", label: "Tình nguyện", icon: HeartHandshake }, { href: "/schedule", label: "Lịch công tác", icon: ClipboardList }],
    },
    { href: "/emulation", label: "Thi đua", icon: Trophy },
    { href: "/quizzes", label: "Trò chơi", icon: Puzzle },
    {
      href: "/confessions", label: "Cộng đồng", icon: Newspaper,
      children: [
        { href: "/confessions", label: "Sơn Hà Confession", icon: Vote },
        { href: "/counseling", label: "Tư vấn tâm lý", icon: HeartHandshake },
        { href: "/feedback", label: "Góp ý", icon: MessageSquare },
      ],
    },
    { href: "/insights", label: "Thống kê", icon: BarChart3, footer: true },
    { href: "/team-chat", label: "Kênh chat", icon: MessagesSquare },
    { href: "/audit", label: "Nhật ký hệ thống", icon: ScrollText, footer: true },
    {
      href: "/cms/tin-tuc", label: "Cổng thông tin", icon: Globe, match: "/cms", open: true,
      children: [
        { href: "/cms/tin-tuc", label: "Tin tức", icon: Newspaper },
        { href: "/cms/ke-hoach", label: "Kế hoạch", icon: ClipboardList },
        { href: "/cms/thong-bao", label: "Thông báo", icon: Bell },
        { href: "/cms/dien-dan", label: "Diễn đàn", icon: MessageSquare },
        { href: "/cms/cau-chuyen-dep", label: "Câu chuyện đẹp", icon: HeartHandshake },
        { href: "/cms/dinh-huong-nghe-nghiep", label: "Hướng nghiệp", icon: Compass },
        { href: "/cms/tai-lieu-sinh-hoat", label: "Tài liệu sinh hoạt", icon: BookOpen },
        { href: "/chapter-reports", label: "Báo cáo Chi đoàn", icon: FileText },
      ],
    },
  ];
}

/** Thanh điều hướng dưới (mobile): 4 mục dùng nhiều nhất theo vai trò, phần còn lại nằm trong nút "Thêm". */
const PRIMARY_MOBILE: Record<Role, string[]> = {
  ADMIN: ["/dashboard", "/departments", "/emulation", "/volunteer"],
  SECRETARY: ["/dashboard", "/members", "/emulation", "/chapter-reports"],
  MEMBER: ["/dashboard", "/games", "/emulation", "/profile"],
};

export function mobileNav(role: Role): { main: NavItem[]; more: NavItem[] } {
  const all: NavItem[] = [...navFor(role), { href: "/settings", label: "Cài đặt", icon: Settings }];
  const keys = PRIMARY_MOBILE[role];
  // Tìm mục (kể cả nằm trong nhóm) cho 4 tab chính
  const flat = all.flatMap((i) => (i.children ? i.children.map((c) => ({ href: c.href, label: c.label, icon: c.icon ?? i.icon })) : [i]));
  // Tên gọn cho thanh dưới (chỗ hẹp)
  const SHORT: Record<string, string> = { "/chapter-reports": "Báo cáo" };
  const main = keys.map((k) => { const it = flat.find((i) => i.href === k)!; return SHORT[k] ? { ...it, label: SHORT[k] } : it; });
  // "Thêm": bỏ các mục đã lên tab chính; nhóm còn 1 mục thì thành mục đơn
  const more: NavItem[] = [];
  for (const it of all) {
    if (!it.children) { if (!keys.includes(it.href)) more.push(it); continue; }
    const rest = it.children.filter((c) => !keys.includes(c.href));
    if (rest.length === it.children.length) more.push(it);
    else if (rest.length === 1) more.push({ href: rest[0].href, label: rest[0].label, icon: rest[0].icon ?? it.icon });
    else if (rest.length > 1) more.push({ ...it, href: rest[0].href, children: rest });
  }
  return { main, more };
}

export const ROLE_LABEL: Record<Role, string> = { ADMIN: "Ban chấp hành Đoàn trường", SECRETARY: "Bí thư Chi đoàn", MEMBER: "Đoàn viên" };

export const PAGE_TITLES: Record<string, string> = {
  dashboard: "Tổng quan", members: "Đoàn viên & thanh niên", departments: "Chi đoàn", activities: "Hoạt động", attendance: "Điểm danh",
  volunteer: "Tình nguyện", games: "Trò chơi", quizzes: "Trò chơi tích điểm", marquee: "Dòng chữ chạy", cms: "Cổng thông tin", "tin-tuc": "Tin tức", "ke-hoach": "Kế hoạch", "su-kien": "Sự kiện", "thong-bao": "Thông báo", "cau-chuyen-dep": "Câu chuyện đẹp", "tro-choi": "Trò chơi", "dinh-huong-nghe-nghiep": "Hướng nghiệp", "tai-lieu-sinh-hoat": "Tài liệu sinh hoạt Chi đoàn", pages: "Trang giới thiệu", "chapter-reports": "Báo cáo Chi đoàn", emulation: "Thi đua", achievements: "Thành tích", reports: "Báo cáo", audit: "Nhật ký hệ thống", settings: "Cài đặt", profile: "Hồ sơ & thẻ số", checkin: "Quét QR điểm danh",
  history: "Lịch sử hoạt động", notifications: "Thông báo", confessions: "Sơn Hà Confession", "team-chat": "Kênh chat", feedback: "Góp ý", counseling: "Tư vấn tâm lý", "dien-dan": "Diễn đàn", approvals: "Hàng chờ duyệt", schedule: "Lịch công tác tuần", new: "Tạo mới", edit: "Chỉnh sửa",
};

/** Tiêu đề riêng cho đường dẫn cụ thể (ưu tiên hơn PAGE_TITLES theo đoạn). */
export const PATH_TITLES: Record<string, string> = {
  "/cms/tin-tuc/new": "Đăng tin", "/cms/cau-chuyen-dep/new": "Đăng câu chuyện", "/cms/dinh-huong-nghe-nghiep/new": "Đăng bài hướng nghiệp", "/cms/tai-lieu-sinh-hoat/new": "Đăng tài liệu sinh hoạt", "/cms/ke-hoach/new": "Đăng kế hoạch", "/cms/su-kien/new": "Tạo sự kiện", "/cms/thong-bao/new": "Đăng thông báo", "/cms/dien-dan/new": "Tạo chủ đề diễn đàn", "/chapter-reports/new": "Đăng báo cáo", "/members/new": "Thêm đoàn viên", "/volunteer/new": "Đăng ký tình nguyện", "/activities/new": "Tạo hoạt động", "/counseling": "Tư vấn tâm lý học đường",
};

/** Nhãn vai trò hiển thị cho một người dùng: Admin tối cao, hoặc chức danh của thành viên BCH. */
export function roleLabelOf(u: { role: Role; superAdmin?: boolean; position?: string | null; isDoanVien?: boolean }): string {
  if (u.role === "ADMIN") return u.superAdmin ? "Quản trị hệ thống" : u.position || "Ban chấp hành Đoàn trường";
  if (u.role === "MEMBER" && u.isDoanVien === false) return "Thanh niên";
  return ROLE_LABEL[u.role];
}
