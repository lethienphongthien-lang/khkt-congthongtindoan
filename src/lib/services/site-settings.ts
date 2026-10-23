import "server-only";
import { cachedPublic } from "@/lib/cache";
import { db } from "@/lib/db";
import { mergeMenu, type MenuConfig } from "@/lib/menu-config";

export const SETTING_FIELDS = [
  { key: "bannerUrl", label: "Ảnh banner", default: "", multiline: false },
  { key: "bannerPublicId", label: "Ảnh banner (mã)", default: "", multiline: false },
  { key: "address", label: "Địa chỉ", default: "Xã Sơn Hà, Tỉnh Quảng Ngãi", multiline: false },
  { key: "phone", label: "Số điện thoại liên hệ", default: "", multiline: false },
  { key: "email", label: "Email liên hệ", default: "", multiline: false },
  { key: "facebook", label: "Liên kết Facebook", default: "", multiline: false },
  { key: "youtube", label: "Liên kết Youtube", default: "", multiline: false },
  { key: "countdownTitle", label: "Tên sự kiện đếm ngược", default: "", multiline: false },
  { key: "countdownAt", label: "Thời điểm đếm ngược", default: "", multiline: false }, // yyyy-MM-ddTHH:mm, giờ Việt Nam
  { key: "countdownLink", label: "Liên kết đếm ngược", default: "", multiline: false },
] as const;

export type SiteSettings = Record<(typeof SETTING_FIELDS)[number]["key"], string>;

/** Đọc cài đặt website; trường chưa nhập dùng giá trị mặc định. */
export const getSiteSettings = cachedPublic("getSiteSettings", async (): Promise<SiteSettings> => {
  const rows = await db.siteSetting.findMany();
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return Object.fromEntries(SETTING_FIELDS.map((f) => [f.key, map.get(f.key) ?? f.default])) as SiteSettings;
});

export const DEFAULT_MARQUEE = "Chào mừng các bạn đến với website Đoàn trường THPT Sơn Hà";

/** Các dòng chữ chạy đang bật, theo thứ tự; trống thì dùng câu chào mặc định. */
export const getMarquee = cachedPublic("getMarquee", async (): Promise<{ id: string; text: string; link: string | null }[]> => {
  const items = await db.marqueeItem.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true, text: true, link: true } });
  return items.length ? items : [{ id: "default", text: DEFAULT_MARQUEE, link: null }];
});

/** Cấu hình menu công khai (thanh trên + thanh bên trái) do Admin sắp xếp; chưa lưu thì dùng mặc định. */
export const getMenuConfig = cachedPublic("getMenuConfig", async (): Promise<MenuConfig> => {
  const row = await db.siteSetting.findUnique({ where: { key: "menuConfig" } });
  if (!row) return mergeMenu(null);
  try { return mergeMenu(JSON.parse(row.value)); } catch { return mergeMenu(null); }
});
