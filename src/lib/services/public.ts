import "server-only";
import type { ArticleKind } from "@prisma/client";
import { cachedPublic } from "@/lib/cache";
import { db } from "@/lib/db";

export const KIND_LABEL: Record<ArticleKind, string> = { NEWS: "Tin tức", PLAN: "Kế hoạch", EVENT: "Sự kiện", ANNOUNCEMENT: "Thông báo", STORY: "Câu chuyện đẹp", GAME: "Trò chơi", CAREER: "Định hướng nghề nghiệp", DOCUMENT: "Tài liệu sinh hoạt Chi đoàn" };
export const KIND_PATH: Record<ArticleKind, string> = { NEWS: "/tin-tuc", PLAN: "/ke-hoach", EVENT: "/su-kien", ANNOUNCEMENT: "/thong-bao", STORY: "/cau-chuyen-dep", GAME: "/tro-choi", CAREER: "/dinh-huong-nghe-nghiep", DOCUMENT: "/tai-lieu-sinh-hoat" };
export const articleHref = (slug: string) => `/bai-viet/${slug}`;

export const SITE_PAGES: Record<string, string> = {
  "doan-truong": "Đoàn trường",
  "bch-doan-truong": "Ban chấp hành Đoàn trường",
  "co-cau-to-chuc": "Cơ cấu tổ chức",
  "co-do": "Cờ đỏ",
  "noi-quy": "Nội quy",
};

const publishedWhere = () => ({ published: true, publishedAt: { lte: new Date() } });

export const articleCard = {
  id: true, kind: true, title: true, slug: true, summary: true, coverUrl: true, publishedAt: true, viewCount: true, eventAt: true, eventLocation: true, department: { select: { name: true } }, category: { select: { id: true, name: true } },
  attachments: { take: 4, orderBy: { createdAt: "asc" }, select: { url: true, name: true } },
} as const;

export const latestArticles = cachedPublic("latestArticles", async (kind: ArticleKind, take: number) =>
  db.article.findMany({ where: { kind, ...publishedWhere() }, orderBy: { publishedAt: "desc" }, take, select: articleCard }));

/** Ảnh bìa của các bài mới nhất (mọi loại) cho dải thư viện ảnh ở trang chủ. */
export const latestCovers = cachedPublic("latestCovers", async (take: number) =>
  db.article.findMany({ where: { ...publishedWhere(), coverUrl: { not: null }, kind: { in: ["NEWS", "STORY"] } }, orderBy: { publishedAt: "desc" }, take, select: { id: true, title: true, slug: true, coverUrl: true } }));

/** Bài khác cho cột bên phải trang chi tiết: cùng loại (4 bài) và 3 loại còn lại (3 bài mỗi loại). */
export const relatedArticles = cachedPublic("relatedArticles", async (current: { id: string; kind: ArticleKind }) => {
  // Cùng loại + 2 loại phổ biến khác (tin tức, thông báo) để cột bên không quá dài
  const kinds: ArticleKind[] = [current.kind, ...(["NEWS", "ANNOUNCEMENT", "STORY"] as ArticleKind[]).filter((k) => k !== current.kind)].slice(0, 3);
  return Promise.all(kinds.map(async (kind) => ({
    kind,
    items: await db.article.findMany({ where: { kind, id: { not: current.id }, ...publishedWhere() }, orderBy: { publishedAt: "desc" }, take: kind === current.kind ? 4 : 3, select: articleCard }),
  })));
});

export const listArticles = cachedPublic("listArticles", async (kind: ArticleKind, page: number, size: number, categoryId?: string) => {
  const where = { kind, ...publishedWhere(), ...(categoryId ? { categoryId: categoryId === "none" ? null : categoryId } : {}) };
  const [items, total] = await Promise.all([
    db.article.findMany({ where, orderBy: { publishedAt: "desc" }, skip: (page - 1) * size, take: size, select: articleCard }),
    db.article.count({ where }),
  ]);
  return { items, total };
});

/** Danh mục của một loại bài kèm số bài đã đăng (để hiện nút lọc ở trang công khai). */
export const articleCategoriesWithCount = cachedPublic("articleCategoriesWithCount", async (kind: ArticleKind) => {
  const [cats, counts, none] = await Promise.all([
    db.articleCategory.findMany({ where: { kind }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true, name: true } }),
    db.article.groupBy({ by: ["categoryId"], where: { kind, ...publishedWhere(), categoryId: { not: null } }, _count: true }),
    db.article.count({ where: { kind, ...publishedWhere(), categoryId: null } }),
  ]);
  const by = new Map(counts.map((c) => [c.categoryId, c._count]));
  return { categories: cats.map((c) => ({ ...c, count: by.get(c.id) ?? 0 })), uncategorized: none };
});

export const getArticle = cachedPublic("getArticle", async (slug: string) => db.article.findFirst({ where: { slug, ...publishedWhere() }, include: { author: { select: { fullName: true } }, department: { select: { name: true } }, category: { select: { id: true, name: true } }, attachments: { orderBy: { createdAt: "asc" } } } }));

export const getSitePage = cachedPublic("getSitePage", async (slug: string) => db.sitePage.findUnique({ where: { slug } }));

/** Lịch tình nguyện công khai: các buổi Chi đoàn đã được duyệt (hoặc đã hoàn thành), từ 14 ngày trước trở đi. */
export const volunteerSchedule = cachedPublic("volunteerSchedule", async () => {
  const from = new Date(Date.now() - 14 * 86400_000);
  return db.volunteerRequest.findMany({
    where: { status: { in: ["APPROVED", "COMPLETED"] }, endAt: { gte: from } },
    orderBy: { startAt: "asc" }, take: 200,
    select: { id: true, task: true, location: true, startAt: true, endAt: true, points: true, hours: true, status: true, department: { select: { name: true, isTeacher: true } } },
  });
}, 60);

/** Chi đoàn nhóm theo khối (lấy số đầu của tên: 10A1 -> khối 10). */
export const departmentsByGrade = cachedPublic("departmentsByGrade", async () => {
  const depts = await db.department.findMany({ where: { graduatedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true, isTeacher: true, _count: { select: { chapterReports: true } } } });
  const groups = new Map<string, typeof depts>();
  for (const d of depts) {
    const g = d.isTeacher ? "gv" : d.name.match(/^\d+/)?.[0] ?? "Khác"; // Chi đoàn giáo viên là nhóm riêng, không thuộc khối nào
    groups.set(g, [...(groups.get(g) ?? []), d]);
  }
  return [...groups.entries()].sort(([a], [b]) => (a === "gv" ? 1 : b === "gv" ? -1 : a.localeCompare(b, "vi", { numeric: true })));
});

/** Route quản lý /cms/<slug> <-> loại bài. Trùng slug với đường dẫn công khai (bỏ dấu "/"). */
export const CMS_SLUG: Record<string, ArticleKind> = { "tin-tuc": "NEWS", "ke-hoach": "PLAN", "thong-bao": "ANNOUNCEMENT", "cau-chuyen-dep": "STORY", "dinh-huong-nghe-nghiep": "CAREER", "tai-lieu-sinh-hoat": "DOCUMENT" };
export { KIND_ACTION } from "./kind";

