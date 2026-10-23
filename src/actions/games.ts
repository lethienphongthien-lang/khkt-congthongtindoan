"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { run, UserError } from "@/lib/action";
import { audit } from "@/lib/audit";
import { requireRole, requireUser } from "@/lib/auth/session";
import { notifyUsers } from "@/lib/notify";
import { deleteImage, isOwnPublicId } from "@/lib/cloudinary";
import { GAME_CAP_KEY, loadPlayState, quizAllows, recordAnswer, type PlayState } from "@/lib/services/games";

// ============================================================ ĐOÀN VIÊN CHƠI
/** Bắt đầu (hoặc tiếp tục) lượt chơi. Mỗi bộ chỉ chơi một lần. */
export async function startQuizAction(quizId: string) {
  return run<{ attemptId: string }>(async () => {
    const user = await requireUser();
    if (!user.memberId) throw new UserError("Chỉ đoàn viên mới chơi để tích điểm");
    const quiz = await db.quiz.findUnique({ where: { id: quizId }, include: { _count: { select: { questions: true } } } });
    const now = new Date();
    if (!quiz || !quiz.published) throw new UserError("Không tìm thấy trò chơi");
    if (quiz.startsAt && quiz.startsAt > now) throw new UserError("Trò chơi chưa mở");
    if (quiz.endsAt && quiz.endsAt < now) throw new UserError("Trò chơi đã kết thúc");
    if (quiz._count.questions === 0) throw new UserError("Trò chơi chưa có câu hỏi");
    if (!quizAllows(quiz, user.departmentId)) throw new UserError("Trò chơi này dành cho Chi đoàn khác");
    const existing = await db.quizAttempt.findUnique({ where: { quizId_memberId: { quizId, memberId: user.memberId } } });
    if (existing) return { data: { attemptId: existing.id } };
    try {
      const a = await db.quizAttempt.create({ data: { quizId, memberId: user.memberId, total: quiz._count.questions } });
      return { data: { attemptId: a.id } };
    } catch {
      const again = await db.quizAttempt.findUnique({ where: { quizId_memberId: { quizId, memberId: user.memberId } } });
      if (again) return { data: { attemptId: again.id } };
      throw new UserError("Không bắt đầu được, hãy thử lại");
    }
  });
}

export async function getPlayStateAction(attemptId: string) {
  return run<PlayState>(async () => {
    const user = await requireUser();
    if (!user.memberId) throw new UserError("Chỉ đoàn viên mới chơi để tích điểm");
    const st = await loadPlayState(attemptId, user.memberId);
    if (!st) throw new UserError("Không tìm thấy lượt chơi");
    return { data: st };
  });
}

export async function answerQuizAction(attemptId: string, questionId: string, response: unknown) {
  return run<Awaited<ReturnType<typeof recordAnswer>>>(async () => {
    const user = await requireUser();
    if (!user.memberId) throw new UserError("Chỉ đoàn viên mới chơi để tích điểm");
    const ok = response === null || typeof response === "number" || typeof response === "string" || (Array.isArray(response) && response.length <= 10 && response.every((x) => typeof x === "number"));
    if (!ok) throw new UserError("Câu trả lời không hợp lệ");
    const fb = await recordAnswer(attemptId, user.memberId, questionId, typeof response === "string" ? response.slice(0, 120) : response);
    if (fb.finished) { revalidatePath("/games"); revalidatePath("/dashboard"); }
    return { data: fb };
  });
}

// ============================================================ BAN CHẤP HÀNH SOẠN
const questionSchema = z.object({
  kind: z.enum(["CHOICE", "FILL", "ORDER"]),
  text: z.string().trim().min(3, "Nhập nội dung câu hỏi").max(300),
  imageUrl: z.string().max(500).optional().or(z.literal("")),
  imagePublicId: z.string().max(300).optional().or(z.literal("")),
  options: z.array(z.string().trim().min(1, "Không để trống đáp án").max(120)).min(1).max(6),
  correct: z.number().int().min(0).max(5).default(0),
  explanation: z.string().trim().max(300).optional().or(z.literal("")),
}).superRefine((q, ctx) => {
  const n = q.options.length;
  if (q.kind === "CHOICE") { if (n < 2 || n > 5) ctx.addIssue({ code: "custom", message: "Trắc nghiệm cần 2 đến 5 lựa chọn" }); if (q.correct >= n) ctx.addIssue({ code: "custom", message: "Chọn đáp án đúng" }); }
  if (q.kind === "ORDER" && (n < 3 || n > 6)) ctx.addIssue({ code: "custom", message: "Sắp xếp cần 3 đến 6 mục" });
  if (q.kind === "FILL" && n > 5) ctx.addIssue({ code: "custom", message: "Tối đa 5 đáp án chấp nhận" });
});
const quizSchema = z.object({
  title: z.string().trim().min(3, "Tiêu đề tối thiểu 3 ký tự").max(120),
  description: z.string().trim().max(300).optional().or(z.literal("")),
  theme: z.enum(["quiz", "truefalse", "picture", "order", "mix"]),
  points: z.number().int().min(0, "Điểm từ 0 đến 20").max(20, "Điểm từ 0 đến 20"),
  secondsPerQuestion: z.number().int().min(10, "Thời gian mỗi câu từ 10 đến 60 giây").max(60, "Thời gian mỗi câu từ 10 đến 60 giây"),
  startsAt: z.string().optional().or(z.literal("")),
  endsAt: z.string().optional().or(z.literal("")),
  published: z.boolean(),
  departmentIds: z.array(z.string().min(1)).max(80).default([]),
  notify: z.boolean(),
  questions: z.array(questionSchema).min(3, "Cần ít nhất 3 câu hỏi").max(30, "Tối đa 30 câu hỏi"),
});

const toDate = (s?: string) => { if (!s) return null; const d = new Date(s); return Number.isNaN(d.getTime()) ? null : d; };

export async function saveQuizAction(id: string | null, input: unknown) {
  return run<{ id: string }>(async () => {
    const admin = await requireRole(["ADMIN"]);
    const d = quizSchema.parse(input);
    const startsAt = toDate(d.startsAt), endsAt = toDate(d.endsAt);
    if (d.startsAt && !startsAt) throw new UserError("Thời điểm mở không hợp lệ");
    if (d.endsAt && !endsAt) throw new UserError("Hạn chơi không hợp lệ");
    if (startsAt && endsAt && endsAt <= startsAt) throw new UserError("Hạn kết thúc phải sau thời điểm mở");
    if (endsAt && d.published && endsAt <= new Date()) throw new UserError("Hạn chơi phải ở tương lai (hoặc để trống)");
    for (const q of d.questions) {
      if (q.imagePublicId && !isOwnPublicId(q.imagePublicId, "activities")) throw new UserError("Ảnh câu hỏi không hợp lệ");
      if (q.kind === "CHOICE" && new Set(q.options.map((o) => o.toLowerCase())).size !== q.options.length) throw new UserError("Các lựa chọn không được trùng nhau");
    }
    const qData = d.questions.map((q, i) => ({
      position: i, kind: q.kind, text: q.text, imageUrl: q.imageUrl || null, imagePublicId: q.imagePublicId || null,
      options: q.options, correct: q.kind === "CHOICE" ? q.correct : 0, explanation: q.explanation || null,
    }));
    if (d.departmentIds.length) {
      const found = await db.department.count({ where: { id: { in: d.departmentIds }, graduatedAt: null } });
      if (found !== new Set(d.departmentIds).size) throw new UserError("Có Chi đoàn không hợp lệ hoặc đã ra trường");
    }
    const meta = { title: d.title, description: d.description || null, theme: d.theme, points: d.points, secondsPerQuestion: d.secondsPerQuestion, startsAt, endsAt, published: d.published, departmentIds: [...new Set(d.departmentIds)] };

    if (id) {
      const cur = await db.quiz.findUnique({ where: { id }, include: { questions: true, _count: { select: { attempts: true } } } });
      if (!cur) throw new UserError("Không tìm thấy trò chơi");
      if (cur._count.attempts > 0) {
        // đã có người chơi: giữ nguyên câu hỏi, điểm và thời gian để công bằng; chỉ cho đổi thông tin hiển thị và hạn
        await db.quiz.update({ where: { id }, data: { title: d.title, description: meta.description, theme: d.theme, startsAt, endsAt, published: d.published, departmentIds: meta.departmentIds } });
      } else {
        const keep = new Set(d.questions.map((q) => q.imagePublicId).filter(Boolean));
        await db.$transaction([
          db.quizQuestion.deleteMany({ where: { quizId: id } }),
          db.quiz.update({ where: { id }, data: { ...meta, questions: { create: qData } } }),
        ]);
        for (const old of cur.questions) if (old.imagePublicId && !keep.has(old.imagePublicId)) await deleteImage(old.imagePublicId);
      }
      await audit(admin.id, "quiz.update", "Quiz", id, { title: d.title });
      revalidatePath("/quizzes"); revalidatePath("/games"); revalidatePath("/tro-choi"); revalidatePath("/");
      return { data: { id }, message: cur._count.attempts > 0 ? "Đã lưu (trò chơi đã có người chơi nên giữ nguyên câu hỏi)" : "Đã lưu trò chơi" };
    }
    const quiz = await db.quiz.create({ data: { ...meta, authorId: admin.id, questions: { create: qData } } });
    if (d.published && d.notify) {
      const users = await db.user.findMany({ where: { status: "ACTIVE", member: meta.departmentIds.length ? { is: { departmentId: { in: meta.departmentIds } } } : { isNot: null } }, select: { id: true } });
      await notifyUsers(users.map((u) => u.id), { type: "SYSTEM", title: "Trò chơi mới, vào chơi tích điểm!", body: d.title, link: `/games/${quiz.id}` });
    }
    await audit(admin.id, "quiz.create", "Quiz", quiz.id, { title: d.title, questions: d.questions.length });
    revalidatePath("/quizzes"); revalidatePath("/games"); revalidatePath("/tro-choi"); revalidatePath("/");
    return { data: { id: quiz.id }, message: "Đã tạo trò chơi" };
  });
}

export async function setQuizPublishedAction(id: string, published: boolean) {
  return run(async () => {
    const admin = await requireRole(["ADMIN"]);
    const q = await db.quiz.findUnique({ where: { id }, include: { _count: { select: { questions: true } } } });
    if (!q) throw new UserError("Không tìm thấy trò chơi");
    if (published && q._count.questions < 3) throw new UserError("Cần ít nhất 3 câu hỏi");
    await db.quiz.update({ where: { id }, data: { published } });
    await audit(admin.id, published ? "quiz.publish" : "quiz.unpublish", "Quiz", id);
    revalidatePath("/quizzes"); revalidatePath("/games"); revalidatePath("/tro-choi"); revalidatePath("/");
    return { message: published ? "Đã mở trò chơi" : "Đã ẩn trò chơi" };
  });
}

export async function deleteQuizAction(id: string) {
  return run(async () => {
    const admin = await requireRole(["ADMIN"]);
    const cur = await db.quiz.findUnique({ where: { id }, include: { questions: { select: { imagePublicId: true } } } });
    if (!cur) throw new UserError("Không tìm thấy trò chơi");
    await db.quiz.delete({ where: { id } });
    for (const q of cur.questions) if (q.imagePublicId) await deleteImage(q.imagePublicId);
    await audit(admin.id, "quiz.delete", "Quiz", id, { title: cur.title });
    revalidatePath("/quizzes"); revalidatePath("/games"); revalidatePath("/tro-choi"); revalidatePath("/");
    return { message: "Đã xóa trò chơi (điểm đã cộng cho đoàn viên được giữ nguyên)" };
  });
}

export async function saveGameCapAction(cap: number) {
  return run(async () => {
    const admin = await requireRole(["ADMIN"]);
    const n = z.number().int().min(0, "Trần điểm từ 0 đến 200").max(200, "Trần điểm từ 0 đến 200").parse(cap);
    await db.siteSetting.upsert({ where: { key: GAME_CAP_KEY }, update: { value: String(n) }, create: { key: GAME_CAP_KEY, value: String(n) } });
    await audit(admin.id, "quiz.cap", "SiteSetting", GAME_CAP_KEY, { cap: n });
    revalidatePath("/quizzes"); revalidatePath("/games"); revalidatePath("/tro-choi"); revalidatePath("/");
    return { message: `Đã đặt trần ${n} điểm trò chơi mỗi tuần` };
  });
}
