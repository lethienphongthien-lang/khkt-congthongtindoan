import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { siteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic"; // tạo khi có yêu cầu (không cần cơ sở dữ liệu lúc build)

const STATIC: [string, number, MetadataRoute.Sitemap[number]["changeFrequency"]][] = [
  ["/", 1, "daily"], ["/tin-tuc", 0.9, "daily"], ["/ke-hoach", 0.8, "weekly"], ["/thong-bao", 0.8, "daily"],
  ["/lich-cong-tac", 0.6, "weekly"], ["/tinh-nguyen", 0.6, "weekly"], ["/bao-cao-chi-doan", 0.6, "weekly"],
  ["/thi-dua", 0.6, "weekly"], ["/thi-dua/thanh-tich", 0.5, "weekly"], ["/thi-dua/chi-doan-tieu-bieu", 0.5, "weekly"],
  ["/cau-chuyen-dep", 0.6, "weekly"], ["/tro-choi", 0.5, "weekly"], ["/on-thi-gplx", 0.6, "monthly"], ["/dinh-huong-nghe-nghiep", 0.6, "weekly"], ["/tai-lieu-sinh-hoat", 0.6, "weekly"], ["/gop-y", 0.3, "yearly"], ["/confession", 0.4, "daily"],
];

/** Sơ đồ trang cho Google: các trang công khai cố định, trang giới thiệu và mọi bài viết đang hiển thị. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const entries: MetadataRoute.Sitemap = STATIC.map(([path, priority, changeFrequency]) => ({ url: `${base}${path}`, priority, changeFrequency }));
  try {
    const [pages, articles] = await Promise.all([
      db.sitePage.findMany({ select: { slug: true, updatedAt: true } }),
      db.article.findMany({ where: { published: true, publishedAt: { lte: new Date() } }, select: { slug: true, updatedAt: true }, orderBy: { publishedAt: "desc" }, take: 5000 }),
    ]);
    for (const p of pages) entries.push({ url: `${base}/gioi-thieu/${p.slug}`, lastModified: p.updatedAt, priority: 0.7, changeFrequency: "monthly" });
    for (const a of articles) entries.push({ url: `${base}/bai-viet/${a.slug}`, lastModified: a.updatedAt, priority: 0.7, changeFrequency: "monthly" });
  } catch (e) {
    console.error("[sitemap] không đọc được dữ liệu, chỉ trả về các trang cố định:", e instanceof Error ? e.message : e);
  }
  return entries;
}
