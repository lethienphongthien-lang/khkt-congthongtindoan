import type { ArticleKind } from "@prisma/client";

/** Slug route quản lý/công khai của từng loại bài (dùng được ở client). */
const SLUG: Record<ArticleKind, string> = { NEWS: "tin-tuc", PLAN: "ke-hoach", EVENT: "su-kien", ANNOUNCEMENT: "thong-bao", STORY: "cau-chuyen-dep", GAME: "tro-choi", CAREER: "dinh-huong-nghe-nghiep", DOCUMENT: "tai-lieu-sinh-hoat" };
export const kindSlug = (k: ArticleKind) => SLUG[k];
export const KIND_ACTION: Record<ArticleKind, string> = { NEWS: "Đăng tin", PLAN: "Đăng kế hoạch", EVENT: "Tạo sự kiện", ANNOUNCEMENT: "Đăng thông báo", STORY: "Đăng câu chuyện", GAME: "Đăng trò chơi", CAREER: "Đăng bài hướng nghiệp", DOCUMENT: "Đăng tài liệu sinh hoạt" };

/** Chuyên mục chỉ Ban chấp hành (Admin) được đăng; bí thư chỉ đăng được các loại còn lại (lưu nháp chờ duyệt). */
export const ADMIN_ONLY_KINDS: ArticleKind[] = ["CAREER", "DOCUMENT"];
