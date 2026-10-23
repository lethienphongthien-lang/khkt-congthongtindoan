import "server-only";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { UserError } from "@/lib/action";
import { notifyUser } from "@/lib/notify";

/** Trần điểm trò chơi mỗi tuần (mỗi đoàn viên), Ban chấp hành đặt trong trang quản lý. */
export const GAME_CAP_KEY = "gameWeeklyCap";
export const DEFAULT_GAME_CAP = 10;
export async function getGameCap(): Promise<number> {
  const r = await db.siteSetting.findUnique({ where: { key: GAME_CAP_KEY } });
  const n = r ? Number(r.value) : DEFAULT_GAME_CAP;
  return Number.isFinite(n) && n >= 0 ? Math.min(200, Math.floor(n)) : DEFAULT_GAME_CAP;
}

const VN = 7 * 3600_000;
/** 00:00 thứ Hai (giờ Việt Nam) của tuần chứa `now`, trả về dạng Date (UTC). */
export function weekStartVN(now = new Date()): Date {
  const v = new Date(now.getTime() + VN);
  const dow = (v.getUTCDay() + 6) % 7; // thứ Hai = 0
  return new Date(Date.UTC(v.getUTCFullYear(), v.getUTCMonth(), v.getUTCDate() - dow) - VN);
}

/** Điểm đạt được theo kết quả, và điểm thực nhận sau khi áp trần tuần. */
export function computeAward(maxPoints: number, correct: number, total: number, usedThisWeek: number, cap: number) {
  const earned = total > 0 ? Math.round((maxPoints * correct) / total) : 0;
  const room = Math.max(0, cap - usedThisWeek);
  const awarded = Math.min(earned, room);
  return { earned, awarded, capped: awarded < earned };
}

export async function gamePointsThisWeek(memberId: string, now = new Date()): Promise<number> {
  const r = await db.pointTransaction.aggregate({ where: { memberId, type: "GAME", createdAt: { gte: weekStartVN(now) } }, _sum: { points: true } });
  return r._sum.points ?? 0;
}

// ---------- chấm câu trả lời
/** Bỏ dấu, hạ chữ thường, gọn khoảng trắng để so đáp án điền từ. */
export function normalizeText(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "d").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

export type StoredQuestion = { id: string; kind: "CHOICE" | "FILL" | "ORDER"; options: unknown; correct: number };
const asStrings = (v: unknown): string[] => (Array.isArray(v) ? v.map((x) => String(x)) : []);

export function gradeAnswer(q: StoredQuestion, response: unknown): boolean {
  const opts = asStrings(q.options);
  if (q.kind === "CHOICE") return typeof response === "number" && Number.isInteger(response) && response === q.correct;
  if (q.kind === "FILL") {
    if (typeof response !== "string") return false;
    const r = normalizeText(response);
    return !!r && opts.some((a) => normalizeText(a) === r);
  }
  // ORDER: phản hồi là mảng chỉ số gốc theo thứ tự người chơi sắp xếp; đúng khi là 0,1,2,...
  if (!Array.isArray(response) || response.length !== opts.length) return false;
  return response.every((v, i) => v === i);
}

/** Đáp án đúng ở dạng văn bản, hiển thị sau khi trả lời. */
export function correctAnswerText(q: StoredQuestion): string {
  const opts = asStrings(q.options);
  if (q.kind === "CHOICE") return opts[q.correct] ?? "";
  if (q.kind === "FILL") return opts[0] ?? "";
  return opts.join(" → ");
}

/** Xáo trộn có hạt giống (cùng hạt giống ra cùng thứ tự: tải lại trang vẫn thấy đúng thứ tự cũ). */
export function seededShuffle<T>(items: T[], seed: string): T[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  const rnd = () => { h += 0x6d2b79f5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/** Câu hỏi gửi xuống máy khách: KHÔNG chứa đáp án. */
export type PublicQuestion = { id: string; kind: "CHOICE" | "FILL" | "ORDER"; text: string; imageUrl: string | null; items: { i: number; text: string }[] };
export function toPublicQuestion(q: { id: string; kind: "CHOICE" | "FILL" | "ORDER"; text: string; imageUrl: string | null; options: unknown }, attemptId: string): PublicQuestion {
  const opts = asStrings(q.options);
  let items: { i: number; text: string }[] = [];
  if (q.kind === "CHOICE") items = seededShuffle(opts.map((text, i) => ({ i, text })), attemptId + q.id);
  else if (q.kind === "ORDER") items = seededShuffle(opts.map((text, i) => ({ i, text })), attemptId + q.id);
  return { id: q.id, kind: q.kind, text: q.text, imageUrl: q.imageUrl, items };
}

export const GRACE_MS = 3000; // cho phép trễ do mạng

// ============================================================ LƯỢT CHƠI

export type AnswerFeedback = {
  correct: boolean; timedOut: boolean; correctText: string; explanation: string | null; streak: number;
  finished: boolean; result?: GameResult;
};
export type GameResult = { correctCount: number; total: number; earned: number; awarded: number; capped: boolean; bestStreak: number; cap: number; usedAfter: number; badges: string[] };

function streaks(flags: boolean[]) {
  let cur = 0, best = 0;
  for (const f of flags) { cur = f ? cur + 1 : 0; best = Math.max(best, cur); }
  return { cur, best };
}

/** Ghi nhận câu trả lời cho câu hiện tại (response = null nghĩa là hết giờ / bỏ qua). Mọi kiểm tra ở máy chủ. */
export async function recordAnswer(attemptId: string, memberId: string, questionId: string | null, response: unknown, now = new Date()): Promise<AnswerFeedback> {
  const cap = await getGameCap();
  return db.$transaction(async (tx) => {
    const attempt = await tx.quizAttempt.findUnique({
      where: { id: attemptId },
      include: { quiz: { include: { questions: { orderBy: { position: "asc" } } } }, answers: { select: { correct: true, question: { select: { position: true } } } } },
    });
    if (!attempt || attempt.memberId !== memberId) throw new UserError("Không tìm thấy lượt chơi");
    if (attempt.finishedAt) throw new UserError("Bạn đã hoàn thành trò chơi này");
    const q = attempt.quiz.questions[attempt.currentIndex];
    if (!q) throw new UserError("Lượt chơi không hợp lệ");
    if (questionId && q.id !== questionId) throw new UserError("Câu hỏi đã thay đổi, hãy tải lại trang");

    if (!attempt.questionStarted) throw new UserError("Câu hỏi chưa được hiển thị");
    const limit = attempt.quiz.secondsPerQuestion * 1000;
    const elapsed = now.getTime() - attempt.questionShownAt.getTime();
    const timedOut = response === null || elapsed > limit + GRACE_MS;
    const stored: StoredQuestion = { id: q.id, kind: q.kind, options: q.options, correct: q.correct };
    const correct = !timedOut && gradeAnswer(stored, response);

    const next = attempt.currentIndex + 1;
    // khóa lạc quan: hai yêu cầu cùng lúc chỉ một yêu cầu thắng
    const moved = await tx.quizAttempt.updateMany({ where: { id: attemptId, currentIndex: attempt.currentIndex, finishedAt: null, questionStarted: true }, data: { currentIndex: next, questionShownAt: now, questionStarted: false } });
    if (moved.count === 0) throw new UserError("Câu hỏi này đã được trả lời");
    await tx.quizAnswer.create({ data: { attemptId, questionId: q.id, response: response === null ? Prisma.JsonNull : (response as Prisma.InputJsonValue), correct, timeMs: Math.min(elapsed, limit) } });

    const flags = [...attempt.answers].sort((a, b) => a.question.position - b.question.position).map((a) => a.correct).concat(correct);
    const st = streaks(flags);
    const base = { correct, timedOut, correctText: correctAnswerText(stored), explanation: q.explanation, streak: st.cur };
    if (next < attempt.total) return { ...base, finished: false };

    // ---- hoàn thành: tính điểm, áp trần tuần, ghi điểm
    const correctCount = flags.filter(Boolean).length;
    const used = (await tx.pointTransaction.aggregate({ where: { memberId, type: "GAME", createdAt: { gte: weekStartVN(now) } }, _sum: { points: true } }))._sum.points ?? 0;
    const award = computeAward(attempt.quiz.points, correctCount, attempt.total, used, cap);
    const member = await tx.member.findUniqueOrThrow({ where: { id: memberId }, select: { userId: true } });
    await tx.quizAttempt.update({ where: { id: attemptId }, data: { finishedAt: now, correctCount, bestStreak: st.best, earnedPoints: award.earned, pointsAwarded: award.awarded } });
    if (award.awarded > 0) {
      await tx.pointTransaction.create({ data: { memberId, type: "GAME", points: award.awarded, reason: `Trò chơi: ${attempt.quiz.title}` } });
      await tx.member.update({ where: { id: memberId }, data: { totalPoints: { increment: award.awarded } } });
      await notifyUser(member.userId, { type: "POINTS", title: `Được cộng ${award.awarded} điểm`, body: `Trò chơi: ${attempt.quiz.title}`, link: "/games" }, tx);
    }
    const badges: string[] = []; // huy hiệu đã bỏ
    return { ...base, finished: true, result: { correctCount, total: attempt.total, earned: award.earned, awarded: award.awarded, capped: award.capped, bestStreak: st.best, cap, usedAfter: used + award.awarded, badges } };
  });
}

export type PlayState = {
  attemptId: string; quiz: { id: string; title: string; theme: string; seconds: number; points: number };
  total: number; index: number; correctSoFar: number; streak: number; marks: boolean[];
  question: PublicQuestion | null; remainingMs: number; finished: boolean;
  summary: { correctCount: number; total: number; earned: number; awarded: number; bestStreak: number } | null;
};

/** Nạp trạng thái lượt chơi; các câu đã quá giờ (đóng trang giữa chừng) được chấm là sai và chuyển tiếp. */
export async function loadPlayState(attemptId: string, memberId: string): Promise<PlayState | null> {
  for (let guard = 0; guard < 40; guard++) {
    const a = await db.quizAttempt.findUnique({
      where: { id: attemptId },
      include: { quiz: { include: { questions: { orderBy: { position: "asc" } } } }, answers: { select: { correct: true, question: { select: { position: true } } } } },
    });
    if (!a || a.memberId !== memberId) return null;
    const flags = [...a.answers].sort((x, y) => x.question.position - y.question.position).map((x) => x.correct);
    const st = streaks(flags);
    const base = { attemptId: a.id, quiz: { id: a.quizId, title: a.quiz.title, theme: a.quiz.theme, seconds: a.quiz.secondsPerQuestion, points: a.quiz.points }, total: a.total };
    if (a.finishedAt) return { ...base, index: a.total, correctSoFar: a.correctCount, streak: st.cur, marks: flags, question: null, remainingMs: 0, finished: true, summary: { correctCount: a.correctCount, total: a.total, earned: a.earnedPoints, awarded: a.pointsAwarded, bestStreak: a.bestStreak } };
    const q = a.quiz.questions[a.currentIndex];
    const limit = a.quiz.secondsPerQuestion * 1000;
    if (!a.questionStarted) {
      // đồng hồ của câu chỉ chạy từ lúc câu được gửi cho người chơi
      await db.quizAttempt.updateMany({ where: { id: a.id, questionStarted: false, finishedAt: null }, data: { questionStarted: true, questionShownAt: new Date() } });
      continue;
    }
    const elapsed = Date.now() - a.questionShownAt.getTime();
    if (elapsed > limit + GRACE_MS) { await recordAnswer(attemptId, memberId, q.id, null).catch(() => {}); continue; }
    return { ...base, index: a.currentIndex, correctSoFar: flags.filter(Boolean).length, streak: st.cur, marks: flags, question: toPublicQuestion(q, a.id), remainingMs: Math.max(0, limit - elapsed), finished: false, summary: null };
  }
  return null;
}

/** Bảng xếp hạng điểm trò chơi trong tuần: top đoàn viên. */
export async function weeklyGameLeaders(take = 5, now = new Date()) {
  const rows = await db.pointTransaction.groupBy({ by: ["memberId"], where: { type: "GAME", createdAt: { gte: weekStartVN(now) } }, _sum: { points: true }, orderBy: { _sum: { points: "desc" } }, take });
  if (!rows.length) return [];
  const members = await db.member.findMany({ where: { id: { in: rows.map((r) => r.memberId) } }, select: { id: true, fullName: true, avatarUrl: true, department: { select: { name: true } } } });
  const by = new Map(members.map((m) => [m.id, m]));
  return rows.map((r, i) => ({ rank: i + 1, memberId: r.memberId, name: by.get(r.memberId)?.fullName ?? "—", department: by.get(r.memberId)?.department.name ?? "", avatarUrl: by.get(r.memberId)?.avatarUrl ?? null, points: r._sum.points ?? 0 }));
}

/** Trò chơi tích điểm đang mở, hiển thị trên cổng thông tin công khai. */
export function listPublicQuizzes(take = 12, viewer: { departmentId: string | null; memberId: string | null; isAdmin: boolean } | null = null) {
  const now = new Date();
  return db.quiz.findMany({
    where: { published: true, OR: [{ startsAt: null }, { startsAt: { lte: now } }], AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }, quizScope(viewer)] },
    orderBy: { createdAt: "desc" }, take,
    select: { id: true, title: true, description: true, theme: true, points: true, secondsPerQuestion: true, endsAt: true, _count: { select: { questions: true } } },
  });
}

/** Quiz mà người xem được chơi: toàn trường (departmentIds rỗng) hoặc có Chi đoàn của họ. Khách: chỉ trò toàn trường. Admin (không có hồ sơ đoàn viên): thấy hết. */
export const quizScope = (viewer: { departmentId: string | null; memberId: string | null; isAdmin: boolean } | null) =>
  viewer?.isAdmin ? {} : viewer?.departmentId ? { OR: [{ departmentIds: { isEmpty: true } }, { departmentIds: { has: viewer.departmentId } }] } : { departmentIds: { isEmpty: true } };
export const quizAllows = (q: { departmentIds: string[] }, departmentId: string | null) => q.departmentIds.length === 0 || (!!departmentId && q.departmentIds.includes(departmentId));
