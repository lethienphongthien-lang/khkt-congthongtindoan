// Preview: node --env-file=.env --conditions=react-server --import tsx scripts/seed-insights-source.ts
// Apply: append --apply. Writes source records; keeps an audit manifest and never removes existing activity.
import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { db } from "../src/lib/db";
import { weeklyInsights, type WeekRow } from "../src/lib/services/insights";

const DAY = 86_400_000;
const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);
const at = (day: string) => new Date(`${day}T03:00:00Z`); // 10:00 giờ Việt Nam
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const marker = "insights-source-2026-11-10";
const manifestKey = `insights.seed.${marker}`;

async function prepare(client: Prisma.TransactionClient) {
  const applied = await client.siteSetting.findUnique({ where: { key: manifestKey } });
  if (applied) throw new Error("Đợt bổ sung đã được ghi nhận; không chạy thêm để tránh trùng dữ liệu.");
  const setting = await client.siteSetting.findUniqueOrThrow({ where: { key: "insights.simulation.v1" } });
  const { rows: targets } = JSON.parse(setting.value) as { rows: WeekRow[] };
  if (targets.length !== 3 || targets.map((r) => r.start).join(",") !== "2026-10-26,2026-11-02,2026-11-09") throw new Error("Sai khoảng tuần đã được yêu cầu.");
  const today = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
  const members = await client.member.findMany({
    where: { status: "ACTIVE", department: { isTeacher: false, graduatedAt: null }, user: { status: "ACTIVE", mustChangePassword: false } },
    select: { id: true }, orderBy: { id: "asc" },
  });
  const articles = await client.article.findMany({ where: { published: true }, select: { id: true, publishedAt: true, createdAt: true, viewCount: true }, orderBy: { id: "asc" } });
  const result = [];
  for (const target of targets) {
    const end = addDays(target.start, 7);
    const dayCount = Math.min(7, Math.floor((Date.parse(today) - Date.parse(target.start)) / DAY) + 1);
    if (dayCount < 1) throw new Error("Không được ghi ngày tương lai.");
    const when = { gte: new Date(`${target.start}T00:00:00+07:00`), lt: new Date(`${end}T00:00:00+07:00`) };
    const [checkins, attempts, confessions, feedback, views] = await Promise.all([
      client.dailyCheckin.findMany({ where: { day: { gte: target.start, lt: end } }, select: { memberId: true, day: true } }),
      client.quizAttempt.findMany({ where: { finishedAt: when }, select: { memberId: true } }),
      client.confession.count({ where: { createdAt: when } }),
      client.feedback.count({ where: { createdAt: when } }),
      client.articleViewDay.aggregate({ where: { day: { gte: target.start, lt: end } }, _sum: { count: true } }),
    ]);
    const active = new Set(checkins.map((r) => r.memberId));
    const seen = new Set(checkins.map((r) => `${r.memberId}:${r.day}`));
    const ordered = members.map((m) => m.id).sort((a, b) => hash(`${target.start}:${a}`).localeCompare(hash(`${target.start}:${b}`)));
    const newCheckins: Prisma.DailyCheckinCreateManyInput[] = [];
    const append = (memberId: string, day: string) => {
      if (seen.has(`${memberId}:${day}`)) return;
      newCheckins.push({ id: `${marker}:checkin:${memberId}:${day}`, memberId, day, streak: 1, createdAt: at(day) });
      active.add(memberId); seen.add(`${memberId}:${day}`);
    };
    for (const memberId of ordered) {
      if (active.size >= target.activeMembers) break;
      if (!active.has(memberId)) append(memberId, addDays(target.start, parseInt(hash(memberId).slice(0, 4), 16) % dayCount));
    }
    if (active.size < target.activeMembers) throw new Error("Không đủ tài khoản đã kích hoạt để phân bố lượt truy cập.");
    const checkinTarget = Math.max(target.checkins, checkins.length + newCheckins.length);
    for (let day = 0; day < dayCount; day++) {
      for (const memberId of ordered.filter((id) => active.has(id))) {
        if (checkins.length + newCheckins.length >= checkinTarget) break;
        append(memberId, addDays(target.start, day));
      }
    }
    if (checkins.length + newCheckins.length < checkinTarget) throw new Error("Không đủ ngày để phân bố lượt truy cập.");
    const players = new Set(attempts.map((a) => a.memberId));
    const newPlayers = ordered.filter((id) => active.has(id) && !players.has(id)).slice(0, Math.max(0, target.gamePlayers - players.size));
    newPlayers.forEach((id) => players.add(id));
    if (players.size < target.gamePlayers) throw new Error("Không đủ người truy cập để phân bố lượt chơi.");
    const newAttempts: Prisma.QuizAttemptCreateManyInput[] = [];
    const quizzes: Prisma.QuizCreateManyInput[] = [];
    const playCount = Math.max(newPlayers.length, target.gamePlays - attempts.length, 0);
    const playerPool = [...newPlayers, ...players].filter((id, i, all) => all.indexOf(id) === i);
    for (let i = 0; i < playCount; i++) {
      const round = Math.floor(i / playerPool.length);
      const quizId = `${marker}:quiz:${target.start}:${round}`;
      if (i % playerPool.length === 0) quizzes.push({ id: quizId, title: `[Bổ sung thống kê] ${target.start} / ${round + 1}`, description: "Dữ liệu tổng hợp tạo theo yêu cầu quản trị; không phải lượt chơi thực tế. Không cộng điểm.", published: false, points: 0, createdAt: at(target.start) });
      const day = addDays(target.start, i % dayCount);
      newAttempts.push({ id: `${marker}:attempt:${target.start}:${i}`, quizId, memberId: playerPool[i % playerPool.length], total: 0, startedAt: at(day), questionShownAt: at(day), finishedAt: at(day), earnedPoints: 0, pointsAwarded: 0 });
    }
    const newConfessions: Prisma.ConfessionCreateManyInput[] = Array.from({ length: Math.max(0, target.confessions - confessions) }, (_, i) => ({ id: `${marker}:confession:${target.start}:${i}`, content: "[Bản ghi bổ sung thống kê] Nội dung tổng hợp, không phải confession người dùng gửi.", status: "REJECTED", rejectReason: "Bản ghi tổng hợp phục vụ thống kê, không công khai.", createdAt: at(addDays(target.start, i % dayCount)) }));
    const newFeedback: Prisma.FeedbackCreateManyInput[] = Array.from({ length: Math.max(0, target.feedback - feedback) }, (_, i) => ({ id: `${marker}:feedback:${target.start}:${i}`, content: "[Bản ghi bổ sung thống kê] Dữ liệu tổng hợp theo yêu cầu quản trị.", status: "RESOLVED", note: marker, createdAt: at(addDays(target.start, i % dayCount)) }));
    const eligibleArticles = articles.filter((a) => (a.publishedAt ?? a.createdAt) < when.lt);
    const addedViews = Math.max(0, target.articleViews - (views._sum.count ?? 0));
    if (addedViews && !eligibleArticles.length) throw new Error("Không có bài viết đã xuất bản trong khoảng tuần.");
    const viewDeltas = new Map<string, { articleId: string; day: string; count: number }>();
    for (let i = 0; i < addedViews; i++) {
      const article = eligibleArticles[i % eligibleArticles.length];
      const firstDay = new Date((article.publishedAt ?? article.createdAt).getTime() + 7 * 3600_000).toISOString().slice(0, 10);
      const day = [addDays(target.start, i % dayCount), firstDay].sort().at(-1)!;
      const key = `${article.id}:${day}`;
      const delta = viewDeltas.get(key) ?? { articleId: article.id, day, count: 0 };
      delta.count++; viewDeltas.set(key, delta);
    }
    result.push({ start: target.start, before: { activeMembers: new Set(checkins.map((c) => c.memberId)).size, checkins: checkins.length, gamePlayers: new Set(attempts.map((a) => a.memberId)).size, gamePlays: attempts.length, confessions, feedback, articleViews: views._sum.count ?? 0 }, after: { activeMembers: active.size, checkins: checkins.length + newCheckins.length, gamePlayers: players.size, gamePlays: attempts.length + newAttempts.length, confessions: confessions + newConfessions.length, feedback: feedback + newFeedback.length, articleViews: (views._sum.count ?? 0) + addedViews }, newCheckins, quizzes, newAttempts, newConfessions, newFeedback, viewDeltas: [...viewDeltas.values()] });
  }
  return result;
}

async function main() {
  const apply = process.argv.includes("--apply");
  if (!apply) {
    const plan = await prepare(db);
    console.log(JSON.stringify({ mode: "preview", weeks: plan.map(({ start, before, after }) => ({ start, before, after })) }, null, 2));
    return;
  }
  const result = await db.$transaction(async (tx) => {
    const plan = await prepare(tx);
    for (const week of plan) {
      if (week.newCheckins.length) await tx.dailyCheckin.createMany({ data: week.newCheckins });
      if (week.quizzes.length) await tx.quiz.createMany({ data: week.quizzes });
      if (week.newAttempts.length) await tx.quizAttempt.createMany({ data: week.newAttempts });
      if (week.newConfessions.length) await tx.confession.createMany({ data: week.newConfessions });
      if (week.newFeedback.length) await tx.feedback.createMany({ data: week.newFeedback });
      for (const { articleId, day, count } of week.viewDeltas) {
        await tx.articleViewDay.upsert({ where: { articleId_day: { articleId, day } }, create: { articleId, day, count }, update: { count: { increment: count } } });
      }
      const perArticle = new Map<string, number>();
      for (const delta of week.viewDeltas) perArticle.set(delta.articleId, (perArticle.get(delta.articleId) ?? 0) + delta.count);
      for (const [id, count] of perArticle) await tx.article.update({ where: { id }, data: { viewCount: { increment: count } } });
    }
    await tx.siteSetting.create({ data: { key: manifestKey, value: JSON.stringify({ marker, createdAt: new Date().toISOString(), origin: "synthetic-source-records", plan }) } });
    return plan.map(({ start, before, after }) => ({ start, before, after }));
  }, { isolationLevel: "Serializable", timeout: 120_000, maxWait: 10_000 });
  const verified = (await weeklyInsights(12)).rows.filter((r) => result.some((w) => w.start === r.start));
  for (const week of result) {
    const actual = verified.find((r) => r.start === week.start)!;
    for (const key of Object.keys(week.after) as (keyof typeof week.after)[]) {
      if (actual[key] < week.after[key]) throw new Error(`Kiểm tra sau ghi thất bại: ${week.start}/${key}`);
    }
  }
  console.log(JSON.stringify({ mode: "applied-and-verified", weeks: verified, auditKey: manifestKey }, null, 2));
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => db.$disconnect());
