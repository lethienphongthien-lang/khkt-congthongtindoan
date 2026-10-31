import { z } from "zod";

/** Mục menu. Mục có sẵn (custom=false) giữ nguyên liên kết, chỉ đổi tên/ẩn/sắp xếp; mục tự thêm (custom) sửa được mọi thứ và xóa được. */
export type NavLink = { id: string; label: string; href: string; short?: string; hidden?: boolean; custom?: boolean };
export type TopItem = NavLink & { children?: NavLink[] };
/** kind "reports" = nhóm Báo cáo Chi đoàn (cây Khối → lớp lấy từ dữ liệu, chỉ đổi tên/ẩn/vị trí). */
export type SideGroup = { id: string; title: string; hidden?: boolean; kind?: "reports"; items: NavLink[] };
export type MenuConfig = { top: TopItem[]; side: SideGroup[] };

const l = (id: string, label: string, href: string, short?: string): NavLink => (short ? { id, label, href, short } : { id, label, href });

export const DEFAULT_MENU: MenuConfig = {
  top: [
    l("ke-hoach", "Kế hoạch", "/ke-hoach"),
    l("tin-tuc", "Tin tức", "/tin-tuc"),
    l("thong-bao", "Thông báo", "/thong-bao"),
    { ...l("thi-dua", "Thi đua", "/thi-dua"), children: [l("thi-dua-thang", "Bảng thi đua", "/thi-dua"), l("thanh-tich", "Thành tích", "/thi-dua/thanh-tich"), l("chi-doan-tieu-bieu", "Chi đoàn tiêu biểu", "/thi-dua/chi-doan-tieu-bieu")] },
    l("dinh-huong", "Hướng nghiệp", "/dinh-huong-nghe-nghiep"),
    l("sinh-hoat", "Sinh hoạt Chi đoàn", "/tai-lieu-sinh-hoat", "Sinh hoạt"),
    l("dien-dan", "Diễn đàn", "/dien-dan"),
    l("tro-choi", "Góc giải trí", "/tro-choi"),
    l("gop-y", "Góp ý", "/gop-y"),
  ],
  side: [
    { id: "gioi-thieu", title: "Giới thiệu", items: [
      l("gt-doan-truong", "Đoàn trường", "/gioi-thieu/doan-truong"),
      l("gt-co-cau", "Cơ cấu tổ chức", "/gioi-thieu/co-cau-to-chuc"), l("gt-co-do", "Cờ đỏ", "/gioi-thieu/co-do"), l("gt-noi-quy", "Nội quy", "/gioi-thieu/noi-quy"),
    ] },
    { id: "bao-cao", title: "Báo cáo Chi đoàn", kind: "reports", items: [] },
    { id: "goc-hs", title: "Góc học sinh", items: [
      l("g-tu-van", "Tư vấn tâm lý", "/tu-van-tam-ly"),
      l("g-cau-chuyen", "Câu chuyện đẹp", "/cau-chuyen-dep"),
      l("g-tinh-nguyen", "Ngày tình nguyện tại chỗ", "/tinh-nguyen"),
      l("g-confession", "Sơn Hà Confession", "/confession"),
      l("g-on-thi-gplx", "Ôn thi lái xe", "/on-thi-gplx"),
    ] },
    { id: "lien-ket", title: "Liên kết website", items: [
      l("lk-c3sonha", "Trường THPT Sơn Hà", "https://c3sonha.quangngai.edu.vn/"),
      l("lk-tinhdoan", "Tỉnh Đoàn Quảng Ngãi", "https://tinhdoan.quangngai.gov.vn/"),
      l("lk-twdoan", "Trung ương Đoàn TNCS", "https://doanthanhnien.vn/"),
      l("lk-so", "Sở GD&ĐT Quảng Ngãi", "https://quangngai.edu.vn/"),
      l("lk-bo", "Bộ Giáo dục và Đào tạo", "https://moet.gov.vn/"),
    ] },
  ],
};

const hrefSchema = z.string().trim().min(1).max(300).refine((h) => (h.startsWith("/") && !h.startsWith("//")) || /^https:\/\//.test(h), "Liên kết phải bắt đầu bằng / hoặc https://");
const linkSchema = z.object({
  id: z.string().min(1).max(60), label: z.string().trim().min(1, "Tên mục không được để trống").max(40, "Tên mục tối đa 40 ký tự"), href: hrefSchema,
  short: z.string().trim().max(20).optional(), hidden: z.boolean().optional(), custom: z.boolean().optional(),
});
export const menuConfigSchema = z.object({
  top: z.array(linkSchema.extend({ children: z.array(linkSchema).max(20).optional() })).max(20, "Thanh menu tối đa 20 mục"),
  side: z.array(z.object({ id: z.string().min(1).max(60), title: z.string().trim().min(1, "Tên nhóm không được để trống").max(40), hidden: z.boolean().optional(), kind: z.literal("reports").optional(), items: z.array(linkSchema).max(30) })).max(12, "Tối đa 12 nhóm"),
});

/** Ghép cấu hình đã lưu với mặc định: mục có sẵn mới thêm ở bản cập nhật sau sẽ tự xuất hiện; mục có sẵn không bao giờ mất (chỉ ẩn). */
export function mergeMenu(saved: unknown): MenuConfig {
  const parsed = menuConfigSchema.safeParse(saved);
  if (!parsed.success) return structuredClone(DEFAULT_MENU);
  const cfg = structuredClone(parsed.data) as MenuConfig;

  // Loại bỏ các mục đã đưa lên thanh trên khỏi nhóm Góc học sinh ở sidebar để tránh trùng lặp
  const SIDE_MOVED_TO_TOP = new Set(["g-dinh-huong", "g-sinh-hoat", "g-tro-choi"]);
  cfg.side = cfg.side.map((g) => g.id === "goc-hs" ? { ...g, items: g.items.filter((it) => it.custom || !SIDE_MOVED_TO_TOP.has(it.id)) } : g);

  // Loại bỏ nhóm trùng lặp ở sidebar (Thi đua đã nằm trên thanh trên)
  cfg.side = cfg.side.filter((g) => g.id !== "thi-dua");

  const seen = new Set<string>();
  const walk = (links: NavLink[]) => links.forEach((x) => seen.add(x.id));
  cfg.top.forEach((t) => { seen.add(t.id); walk(t.children ?? []); });
  cfg.side.forEach((g) => { seen.add("g:" + g.id); walk(g.items); });
  for (const d of DEFAULT_MENU.top) {
    if (!seen.has(d.id)) cfg.top.push(structuredClone(d));
    else if (d.children) {
      const cur = cfg.top.find((t) => t.id === d.id);
      if (cur) for (const c of d.children) if (!seen.has(c.id)) (cur.children ??= []).push(structuredClone(c));
    }
  }
  for (const g of DEFAULT_MENU.side) {
    if (!seen.has("g:" + g.id)) { cfg.side.push(structuredClone(g)); continue; }
    for (const it of g.items) if (!seen.has(it.id)) cfg.side.find((x) => x.id === g.id)?.items.push(structuredClone(it));
  }
  // Các trang đã bỏ: gỡ khỏi cấu hình đã lưu để không còn liên kết hỏng
  const REMOVED = ["/lich-hoat-dong", "/gioi-thieu/bch-doan-truong"];
  const keep = (l: NavLink) => !REMOVED.includes(l.href);
  const renameDefault = <T extends NavLink>(l: T): T => {
    if (l.id === "dinh-huong" && l.label === "Định hướng") return { ...l, label: "Hướng nghiệp" };
    if (l.id === "g-dinh-huong" && (l.label === "Định hướng" || l.label === "Định hướng nghề nghiệp")) return { ...l, label: "Hướng nghiệp" };
    if (l.id === "tro-choi" && l.label === "Trò chơi") return { ...l, label: "Góc giải trí" };
    if (l.id === "g-tro-choi" && l.label === "Trò chơi") return { ...l, label: "Góc giải trí" };
    return l;
  };
  cfg.top = cfg.top.filter(keep).map((t) => {
    const ren = renameDefault(t);
    return ren.children ? { ...ren, children: ren.children.filter(keep).map(renameDefault) } : ren;
  });
  cfg.side = cfg.side.map((g) => ({ ...g, items: g.items.filter(keep).map(renameDefault) }));
  return cfg;
}
