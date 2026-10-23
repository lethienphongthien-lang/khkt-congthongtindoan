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
    { ...l("thi-dua", "Thi đua", "/thi-dua"), children: [l("thi-dua-thang", "Bảng thi đua", "/thi-dua"), l("thanh-tich", "Thành tích", "/thi-dua/thanh-tich"), l("chi-doan-tieu-bieu", "Chi đoàn tiêu biểu", "/thi-dua/chi-doan-tieu-bieu")] },
    l("dinh-huong", "Định hướng", "/dinh-huong-nghe-nghiep"),
    l("sinh-hoat", "Sinh hoạt Chi đoàn", "/tai-lieu-sinh-hoat", "Sinh hoạt"),
    l("thong-bao", "Thông báo", "/thong-bao"),
    l("tro-choi", "Trò chơi", "/tro-choi"),
    l("gop-y", "Góp ý", "/gop-y"),
  ],
  side: [
    { id: "gioi-thieu", title: "Giới thiệu", items: [
      l("gt-doan-truong", "Đoàn trường", "/gioi-thieu/doan-truong"), l("gt-bch", "BCH Đoàn trường", "/gioi-thieu/bch-doan-truong"),
      l("gt-co-cau", "Cơ cấu tổ chức", "/gioi-thieu/co-cau-to-chuc"), l("gt-co-do", "Cờ đỏ", "/gioi-thieu/co-do"), l("gt-noi-quy", "Nội quy", "/gioi-thieu/noi-quy"),
    ] },
    { id: "bao-cao", title: "Báo cáo Chi đoàn", kind: "reports", items: [] },
    { id: "goc-hs", title: "Góc học sinh", items: [
      l("g-dinh-huong", "Định hướng nghề nghiệp", "/dinh-huong-nghe-nghiep"), l("g-sinh-hoat", "Tài liệu sinh hoạt Chi đoàn", "/tai-lieu-sinh-hoat"),
      l("g-tro-choi", "Trò chơi", "/tro-choi"), l("g-tinh-nguyen", "Ngày tình nguyện tại chỗ", "/tinh-nguyen"), l("g-cau-chuyen", "Câu chuyện đẹp", "/cau-chuyen-dep"), l("g-confession", "Sơn Hà Confession", "/confession"),
    ] },
    { id: "thi-dua", title: "Thi đua", items: [l("td-thang", "Bảng thi đua", "/thi-dua"), l("td-thanh-tich", "Thành tích", "/thi-dua/thanh-tich"), l("td-tieu-bieu", "Chi đoàn tiêu biểu", "/thi-dua/chi-doan-tieu-bieu")] },
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
  // Các trang đã bỏ (hoạt động, tình nguyện): gỡ khỏi cấu hình đã lưu để không còn liên kết hỏng
  const REMOVED = ["/lich-hoat-dong"];
  const keep = (l: NavLink) => !REMOVED.includes(l.href);
  cfg.top = cfg.top.filter(keep).map((t) => (t.children ? { ...t, children: t.children.filter(keep) } : t));
  cfg.side = cfg.side.map((g) => ({ ...g, items: g.items.filter(keep) }));
  return cfg;
}
