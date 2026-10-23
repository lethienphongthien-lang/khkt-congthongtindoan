"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { vnDay } from "@/lib/services/visits";
import { run } from "@/lib/action";
import { getCurrentUser } from "@/lib/auth/session";
import { recordVisit } from "@/lib/services/visits";

/** Được gọi một lần mỗi ngày khi đoàn viên mở hệ thống: ghi ngày truy cập và cộng 1 điểm. */
export async function recordVisitAction() {
  return run<{ created: boolean }>(async () => {
    const user = await getCurrentUser();
    if (!user?.memberId || user.mustChangePassword) return { data: { created: false } };
    const r = await recordVisit(user.memberId);
    if (r.created) revalidatePath("/dashboard");
    return { data: r };
  });
}

/**
 * Tăng lượt xem của trang công khai (bài viết, báo cáo Chi đoàn, trang giới thiệu); gọi từ trình duyệt mỗi lần mở trang.
 * Dùng SQL trực tiếp để không làm đổi cột "updatedAt" của bản ghi. Không xóa bộ nhớ đệm: số liệu trong danh sách cập nhật theo chu kỳ của bộ nhớ đệm.
 */
export async function recordViewAction(kind: "article" | "report" | "page", id: string) {
  if (typeof id !== "string" || id.length > 60) return;
  try {
    if (kind === "article") {
      const n = await db.$executeRaw`UPDATE "Article" SET "viewCount" = "viewCount" + 1 WHERE "id" = ${id} AND "published" = true`;
      if (n) {
        const day = vnDay();
        await db.articleViewDay.upsert({ where: { articleId_day: { articleId: id, day } }, create: { articleId: id, day, count: 1 }, update: { count: { increment: 1 } } });
      }
    } else if (kind === "report") {
      await db.$executeRaw`UPDATE "ChapterReport" SET "viewCount" = "viewCount" + 1 WHERE "id" = ${id}`;
    } else {
      await db.$executeRaw`UPDATE "SitePage" SET "viewCount" = "viewCount" + 1 WHERE "slug" = ${id}`;
    }
  } catch { /* không ảnh hưởng người đọc */ }
}
