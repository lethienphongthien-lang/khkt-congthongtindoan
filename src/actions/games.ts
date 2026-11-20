"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n/server";
import type { TFn } from "@/lib/i18n/translate";
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
    const t = await getT();
    const user = await requireUser();
    if (!user.memberId) throw new UserError(t("community.sa.memberOnly"));
    const quiz = await db.quiz.findUnique({ where: { id: quizId }, include: { _count: { select: { questions: true } } } });
    const now = new Date();
    if (!quiz || !quiz.published) throw new UserError(t("community.sa.gameMissing"));
    if (quiz.startsAt && quiz.startsAt > now) throw new UserError(t("community.sa.gameNotOpen"));
    if (quiz.endsAt && quiz.endsAt < now) throw new UserError(t("community.sa.gameEnded"));
    if (quiz._count.questions === 0) throw new UserError(t("community.sa.gameNoQ"));
    if (!quizAllows(quiz, user.departmentId)) throw new UserError(t("community.sa.gameOther"));
    const existing = await db.quizAttempt.findUnique({ where: { quizId_memberId: { quizId, memberId: user.memberId } } });
    if (existing) return { data: { attemptId: existing.id } };
    try {
      const a = await db.quizAttempt.create({ data: { quizId, memberId: user.memberId, total: quiz._count.questions } });
      return { data: { attemptId: a.id } };
    } catch {
      const again = await db.quizAttempt.findUnique({ where: { quizId_memberId: { quizId, memberId: user.memberId } } });
      if (again) return { data: { attemptId: again.id } };
      throw new UserError(t("community.sa.gameStartFail"));
    }
  });
}

export async function getPlayStateAction(attemptId: string) {
  return run<PlayState>(async () => {
    const t = await getT();
    const user = await requireUser();
    if (!user.memberId) throw new UserError(t("community.sa.memberOnly"));
    const st = await loadPlayState(attemptId, user.memberId);
    if (!st) throw new UserError(t("community.sa.attemptMissing"));
    return { data: st };
  });
}

export async function answerQuizAction(attemptId: string, questionId: string, response: unknown) {
  return run<Awaited<ReturnType<typeof recordAnswer>>>(async () => {
    const t = await getT();
    const user = await requireUser();
    if (!user.memberId) throw new UserError(t("community.sa.memberOnly"));
    const ok = response === null || typeof response === "number" || typeof response === "string" || (Array.isArray(response) && response.length <= 10 && response.every((x) => typeof x === "number"));
    if (!ok) throw new UserError(t("community.sa.answerInvalid"));
    const fb = await recordAnswer(attemptId, user.memberId, questionId, typeof response === "string" ? response.slice(0, 120) : response);
    if (fb.finished) { revalidatePath("/games"); revalidatePath("/dashboard"); }
    return { data: fb };
  });
}

// ============================================================ BAN CHẤP HÀNH SOẠN
const makeQuestionSchema = (t: TFn) => z.object({
  kind: z.enum(["CHOICE", "FILL", "ORDER"]),
  text: z.string().trim().min(3, t("misc.g.qText")).max(300),
  imageUrl: z.string().max(500).optional().or(z.literal("")),
  imagePublicId: z.string().max(300).optional().or(z.literal("")),
  options: z.array(z.string().trim().min(1, t("misc.g.optEmpty")).max(120)).min(1).max(6),
  correct: z.number().int().min(0).max(5).default(0),
  explanation: z.string().trim().max(300).optional().or(z.literal("")),
}).superRefine((q, ctx) => {
  const n = q.options.length;
  if (q.kind === "CHOICE") { if (n < 2 || n > 5) ctx.addIssue({ code: "custom", message: t("misc.g.choiceCount") }); if (q.correct >= n) ctx.addIssue({ code: "custom", message: t("misc.g.pickCorrect") }); }
  if (q.kind === "ORDER" && (n < 3 || n > 6)) ctx.addIssue({ code: "custom", message: t("misc.g.orderCount") });
  if (q.kind === "FILL" && n > 5) ctx.addIssue({ code: "custom", message: t("misc.g.fillMax") });
});
const makeQuizSchema = (t: TFn) => z.object({
  title: z.string().trim().min(3, t("misc.g.titleMin")).max(120),
  description: z.string().trim().max(300).optional().or(z.literal("")),
  theme: z.enum(["quiz", "truefalse", "picture", "order", "mix"]),
  points: z.number().int().min(0, t("misc.g.points")).max(20, t("misc.g.points")),
  secondsPerQuestion: z.number().int().min(10, t("misc.g.seconds")).max(60, t("misc.g.seconds")),
  startsAt: z.string().optional().or(z.literal("")),
  endsAt: z.string().optional().or(z.literal("")),
  published: z.boolean(),
  departmentIds: z.array(z.string().min(1)).max(80).default([]),
  notify: z.boolean(),
  questions: z.array(makeQuestionSchema(t)).min(3, t("misc.g.minQ")).max(30, t("misc.g.maxQ")),
});

const toDate = (s?: string) => { if (!s) return null; const d = new Date(s); return Number.isNaN(d.getTime()) ? null : d; };

export async function saveQuizAction(id: string | null, input: unknown) {
  return run<{ id: string }>(async () => {
    const admin = await requireRole(["ADMIN"]);
    const t = await getT();
    const d = makeQuizSchema(t).parse(input);
    const startsAt = toDate(d.startsAt), endsAt = toDate(d.endsAt);
    if (d.startsAt && !startsAt) throw new UserError(t("misc.g.badStart"));
    if (d.endsAt && !endsAt) throw new UserError(t("misc.g.badEnd"));
    if (startsAt && endsAt && endsAt <= startsAt) throw new UserError(t("misc.g.endBeforeStart"));
    if (endsAt && d.published && endsAt <= new Date()) throw new UserError(t("misc.g.endFuture"));
    for (const q of d.questions) {
      if (q.imagePublicId && !isOwnPublicId(q.imagePublicId, "activities")) throw new UserError(t("misc.g.badImage"));
      if (q.kind === "CHOICE" && new Set(q.options.map((o) => o.toLowerCase())).size !== q.options.length) throw new UserError(t("misc.g.dupOpts"));
    }
    const qData = d.questions.map((q, i) => ({
      position: i, kind: q.kind, text: q.text, imageUrl: q.imageUrl || null, imagePublicId: q.imagePublicId || null,
      options: q.options, correct: q.kind === "CHOICE" ? q.correct : 0, explanation: q.explanation || null,
    }));
    if (d.departmentIds.length) {
      const found = await db.department.count({ where: { id: { in: d.departmentIds }, graduatedAt: null } });
      if (found !== new Set(d.departmentIds).size) throw new UserError(t("misc.g.badDept"));
    }
    const meta = { title: d.title, description: d.description || null, theme: d.theme, points: d.points, secondsPerQuestion: d.secondsPerQuestion, startsAt, endsAt, published: d.published, departmentIds: [...new Set(d.departmentIds)] };

    if (id) {
      const cur = await db.quiz.findUnique({ where: { id }, include: { questions: true, _count: { select: { attempts: true } } } });
      if (!cur) throw new UserError(t("misc.g.notFound"));
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
      return { data: { id }, message: cur._count.attempts > 0 ? t("misc.g.savedKept") : t("misc.g.saved") };
    }
    const quiz = await db.quiz.create({ data: { ...meta, authorId: admin.id, questions: { create: qData } } });
    if (d.published && d.notify) {
      const users = await db.user.findMany({ where: { status: "ACTIVE", member: meta.departmentIds.length ? { is: { departmentId: { in: meta.departmentIds } } } : { isNot: null } }, select: { id: true } });
      await notifyUsers(users.map((u) => u.id), { type: "SYSTEM", title: "Trò chơi mới, vào chơi tích điểm!", body: d.title, link: `/games/${quiz.id}` });
    }
    await audit(admin.id, "quiz.create", "Quiz", quiz.id, { title: d.title, questions: d.questions.length });
    revalidatePath("/quizzes"); revalidatePath("/games"); revalidatePath("/tro-choi"); revalidatePath("/");
    return { data: { id: quiz.id }, message: t("misc.g.created") };
  });
}

export async function setQuizPublishedAction(id: string, published: boolean) {
  return run(async () => {
    const t = await getT();
    const admin = await requireRole(["ADMIN"]);
    const q = await db.quiz.findUnique({ where: { id }, include: { _count: { select: { questions: true } } } });
    if (!q) throw new UserError(t("misc.g.notFound"));
    if (published && q._count.questions < 3) throw new UserError(t("misc.g.minQ"));
    await db.quiz.update({ where: { id }, data: { published } });
    await audit(admin.id, published ? "quiz.publish" : "quiz.unpublish", "Quiz", id);
    revalidatePath("/quizzes"); revalidatePath("/games"); revalidatePath("/tro-choi"); revalidatePath("/");
    return { message: published ? t("misc.g.opened") : t("misc.g.hidden") };
  });
}

export async function deleteQuizAction(id: string) {
  return run(async () => {
    const t = await getT();
    const admin = await requireRole(["ADMIN"]);
    const cur = await db.quiz.findUnique({ where: { id }, include: { questions: { select: { imagePublicId: true } } } });
    if (!cur) throw new UserError(t("misc.g.notFound"));
    await db.quiz.delete({ where: { id } });
    for (const q of cur.questions) if (q.imagePublicId) await deleteImage(q.imagePublicId);
    await audit(admin.id, "quiz.delete", "Quiz", id, { title: cur.title });
    revalidatePath("/quizzes"); revalidatePath("/games"); revalidatePath("/tro-choi"); revalidatePath("/");
    return { message: t("misc.g.deleted") };
  });
}

export async function saveGameCapAction(cap: number) {
  return run(async () => {
    const t = await getT();
    const admin = await requireRole(["ADMIN"]);
    const n = z.number().int().min(0, t("misc.g.capRange")).max(200, t("misc.g.capRange")).parse(cap);
    await db.siteSetting.upsert({ where: { key: GAME_CAP_KEY }, update: { value: String(n) }, create: { key: GAME_CAP_KEY, value: String(n) } });
    await audit(admin.id, "quiz.cap", "SiteSetting", GAME_CAP_KEY, { cap: n });
    revalidatePath("/quizzes"); revalidatePath("/games"); revalidatePath("/tro-choi"); revalidatePath("/");
    return { message: t("misc.g.capSet", { n }) };
  });
}
