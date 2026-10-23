"use server";

import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { run, UserError } from "@/lib/action";
import { audit } from "@/lib/audit";
import { getCurrentUser, requireRole } from "@/lib/auth/session";
import { notifyUsers } from "@/lib/notify";
import { listApprovedConfessions } from "@/lib/services/confessions";

const confessionSchema = z.object({
  content: z.string().trim().min(10, "Nội dung quá ngắn (tối thiểu 10 ký tự)").max(1500, "Tối đa 1500 ký tự"),
  nickname: z.string().trim().max(40, "Biệt danh tối đa 40 ký tự").optional(),
  website: z.string().max(0).optional(), // ô ẩn chống bot
});

/** Gửi confession ẩn danh từ trang công khai (không cần đăng nhập). Chỉ hiện sau khi được duyệt. */
export async function submitConfessionAction(input: unknown) {
  return run(async () => {
    const parsed = confessionSchema.safeParse(input);
    if (!parsed.success) {
      if ((input as { website?: string } | null)?.website) return { message: "Đã gửi confession" }; // bot: giả vờ thành công
      throw parsed.error;
    }
    const d = parsed.data;
    const recent = await db.confession.count({ where: { createdAt: { gte: new Date(Date.now() - 3600_000) } } });
    if (recent >= 30) throw new UserError("Hệ thống đang nhận quá nhiều confession, vui lòng thử lại sau ít phút");
    const c = await db.confession.create({ data: { content: d.content, nickname: d.nickname || null } });
    const admins = await db.user.findMany({ where: { role: "ADMIN", status: "ACTIVE" }, select: { id: true } });
    await notifyUsers(admins.map((a) => a.id), { type: "SYSTEM", title: "Có confession mới chờ duyệt", body: d.content.slice(0, 80), link: "/confessions" });
    void c;
    revalidatePath("/confessions");
    return { message: "Confession của bạn đã được gửi và đang chờ Ban chấp hành duyệt." };
  });
}

export async function reviewConfessionAction(id: string, decision: "APPROVED" | "REJECTED") {
  return run(async () => {
    const admin = await requireRole(["ADMIN"]);
    const status = z.enum(["APPROVED", "REJECTED"]).parse(decision);
    const c = await db.confession.findUnique({ where: { id } });
    if (!c) throw new UserError("Không tìm thấy confession");
    await db.confession.update({ where: { id }, data: { status, reviewedById: admin.id, reviewedAt: new Date() } });
    await audit(admin.id, status === "APPROVED" ? "confession.approve" : "confession.reject", "Confession", id);
    revalidatePath("/confessions"); revalidatePath("/confession");
    return { message: status === "APPROVED" ? "Đã duyệt, confession đã hiện công khai" : "Đã từ chối confession" };
  });
}

export async function deleteConfessionAction(id: string) {
  return run(async () => {
    const admin = await requireRole(["ADMIN"]);
    await db.confession.delete({ where: { id } });
    await audit(admin.id, "confession.delete", "Confession", id);
    revalidatePath("/confessions"); revalidatePath("/confession");
    return { message: "Đã xóa confession" };
  });
}

const ANON_COOKIE = "confession_anon";

/** Thích / bỏ thích. Chưa đăng nhập thì dùng mã ẩn danh lưu trong cookie. */
export async function toggleConfessionLikeAction(confessionId: string) {
  return run(async () => {
    const c = await db.confession.findFirst({ where: { id: confessionId, status: "APPROVED" }, select: { id: true } });
    if (!c) throw new UserError("Không tìm thấy confession");
    const user = await getCurrentUser();
    const jar = await cookies();
    let anonKey = jar.get(ANON_COOKIE)?.value;
    if (!user && !anonKey) {
      anonKey = randomUUID();
      jar.set(ANON_COOKIE, anonKey, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 365, path: "/" });
    }
    const who = user ? { userId: user.id } : { anonKey: anonKey! };
    const existing = await db.confessionLike.findFirst({ where: { confessionId, ...who }, select: { id: true } });
    if (existing) await db.confessionLike.delete({ where: { id: existing.id } });
    else await db.confessionLike.create({ data: { confessionId, ...who } }).catch(() => {}); // bấm đúp: bỏ qua trùng
    const count = await db.confessionLike.count({ where: { confessionId } });
    return { data: { liked: !existing, count } };
  });
}

const commentSchema = z.object({
  content: z.string().trim().min(1, "Hãy nhập bình luận").max(500, "Tối đa 500 ký tự"),
  website: z.string().max(0).optional(),
});

/** Bình luận: ai cũng gửi được, chưa đăng nhập thì hiện là "Ẩn danh". */
export async function addConfessionCommentAction(confessionId: string, input: unknown) {
  return run(async () => {
    const d = commentSchema.parse(input);
    const c = await db.confession.findFirst({ where: { id: confessionId, status: "APPROVED" }, select: { id: true } });
    if (!c) throw new UserError("Không tìm thấy confession");
    const user = await getCurrentUser();
    const recent = await db.confessionComment.count({ where: { createdAt: { gte: new Date(Date.now() - 600_000) } } });
    if (recent >= 100) throw new UserError("Đang có quá nhiều bình luận, vui lòng thử lại sau ít phút");
    const row = await db.confessionComment.create({
      data: { confessionId, userId: user?.id ?? null, authorName: user ? user.fullName : "Ẩn danh", content: d.content },
    });
    return { data: { id: row.id, authorName: row.authorName, content: row.content, createdAt: row.createdAt.toISOString() } };
  });
}

export async function deleteConfessionCommentAction(id: string) {
  return run(async () => {
    const admin = await requireRole(["ADMIN"]);
    await db.confessionComment.delete({ where: { id } });
    await audit(admin.id, "confession.comment.delete", "ConfessionComment", id);
    return { message: "Đã xóa bình luận" };
  });
}

/** Tải thêm confession (phân trang kiểu "Xem thêm"). */
export async function loadMoreConfessionsAction(skip: number) {
  return run(async () => {
    const n = z.number().int().min(0).max(5000).parse(skip);
    return { data: await listApprovedConfessions(n) };
  });
}
