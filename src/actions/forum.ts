"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { run, UserError } from "@/lib/action";
import { audit } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth/session";

const commentSchema = z.object({
  content: z.string().trim().min(2, "Bình luận quá ngắn (tối thiểu 2 ký tự)").max(1000, "Tối đa 1000 ký tự"),
  authorName: z.string().trim().max(50).optional(),
});

export type ForumCommentDTO = {
  id: string;
  content: string;
  authorName: string;
  createdAt: string;
  canDelete?: boolean;
};

/** Lấy danh sách ý kiến thảo luận của một bài viết diễn đàn */
export async function getForumComments(articleId: string): Promise<ForumCommentDTO[]> {
  const user = await getCurrentUser();
  const isAdmin = user?.role === "ADMIN";

  const rows = await db.feedback.findMany({
    where: { category: `forum:${articleId}` },
    orderBy: { createdAt: "asc" },
    select: { id: true, content: true, contact: true, createdAt: true, note: true },
  });

  return rows.map((r) => ({
    id: r.id,
    content: r.content,
    authorName: r.contact || "Đoàn viên/Học sinh",
    createdAt: r.createdAt.toISOString(),
    canDelete: isAdmin || (!!user && r.note === user.id),
  }));
}

/** Gửi bình luận thảo luận cho bài viết diễn đàn */
export async function addForumCommentAction(articleId: string, input: unknown) {
  return run<ForumCommentDTO>(async () => {
    const d = commentSchema.parse(input);
    const user = await getCurrentUser();

    // Nếu đã đăng nhập, lấy họ tên và chi đoàn (nếu có)
    let authorName = d.authorName?.trim() || "";
    if (user) {
      authorName = user.fullName;
      if (user.departmentName) {
        authorName += ` (${user.departmentName})`;
      } else if (user.role === "ADMIN") {
        authorName += " (BCH)";
      }
    } else if (!authorName) {
      authorName = "Học sinh";
    }

    // Giới hạn tần suất để chống spam
    const recent = await db.feedback.count({
      where: {
        category: `forum:${articleId}`,
        createdAt: { gte: new Date(Date.now() - 60_000) },
      },
    });
    if (recent >= 20) {
      throw new UserError("Hệ thống đang nhận nhiều bình luận, vui lòng thử lại sau giây lát");
    }

    const row = await db.feedback.create({
      data: {
        category: `forum:${articleId}`,
        content: d.content,
        contact: authorName,
        note: user?.id ?? null, // Lưu userId để người đăng tự xóa được
      },
    });

    revalidatePath("/dien-dan");
    return {
      data: {
        id: row.id,
        content: row.content,
        authorName,
        createdAt: row.createdAt.toISOString(),
        canDelete: true,
      },
      message: "Đã gửi ý kiến thảo luận thành công",
    };
  });
}

/** Xóa bình luận thảo luận (Admin hoặc người đăng) */
export async function deleteForumCommentAction(commentId: string) {
  return run(async () => {
    const user = await getCurrentUser();
    if (!user) throw new UserError("Bạn cần đăng nhập để thực hiện");

    const row = await db.feedback.findUnique({ where: { id: commentId } });
    if (!row || !row.category?.startsWith("forum:")) throw new UserError("Bình luận không tồn tại");

    if (user.role !== "ADMIN" && row.note !== user.id) {
      throw new UserError("Bạn không có quyền xóa bình luận này");
    }

    await db.feedback.delete({ where: { id: commentId } });
    if (user.role === "ADMIN") {
      await audit(user.id, "forum.comment.delete", "Feedback", commentId);
    }
    revalidatePath("/dien-dan");
    return { message: "Đã xóa bình luận" };
  });
}

