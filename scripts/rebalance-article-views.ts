// node --env-file=.env --import tsx scripts/rebalance-article-views.ts [--apply]
// Explicit synthetic top-up of the three requested weeks. Idempotent; no existing views are removed.
import assert from "node:assert/strict";
import { Prisma } from "@prisma/client";
import { db } from "../src/lib/db";

const auditKey = "insights.article-view-rebalance.2026-11-10.v1";
const donorStart = "2026-10-19", donorEnd = "2026-10-26";
const requests = [
  { start: "2026-10-26", factor: 0.96 },
  { start: "2026-11-02", factor: 1.04 },
  { start: "2026-11-09", factor: 1.02 },
];
const DAY = 86_400_000;
const addDay = (day: string, n: number) => new Date(Date.parse(day) + n * DAY).toISOString().slice(0, 10);
const weekday = (day: string) => (new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7;

/** Largest remainders keep integer allocations equal to the exact requested total. */
function allocate(total: number, weights: number[]) {
  assert(Number.isSafeInteger(total) && total >= 0);
  assert(weights.length > 0 && weights.every((n) => Number.isFinite(n) && n >= 0));
  const sum = weights.reduce((a, b) => a + b, 0);
  const shares = weights.map((n) => total * (sum ? n / sum : 1 / weights.length));
  const counts = shares.map(Math.floor);
  const rest = total - counts.reduce((a, b) => a + b, 0);
  const order = shares.map((n, i) => ({ i, fraction: n - counts[i] })).sort((a, b) => b.fraction - a.fraction || a.i - b.i);
  for (const { i } of order.slice(0, rest)) counts[i]++;
  assert.equal(counts.reduce((a, b) => a + b, 0), total);
  return counts;
}

async function prepare(tx: Prisma.TransactionClient) {
  if (await tx.siteSetting.findUnique({ where: { key: auditKey } })) throw new Error("Đã bổ sung đợt này; không chạy lặp.");
  const today = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
  assert(today === "2026-11-10", "Script chỉ dùng cho đợt đã yêu cầu ngày 10/11/2026.");
  const [donor, articles, existing] = await Promise.all([
    tx.articleViewDay.findMany({ where: { day: { gte: donorStart, lt: donorEnd } }, orderBy: [{ articleId: "asc" }, { day: "asc" }] }),
    tx.article.findMany({ where: { published: true }, select: { id: true, viewCount: true, publishedAt: true, createdAt: true }, orderBy: { id: "asc" } }),
    tx.articleViewDay.findMany({ where: { day: { gte: requests[0].start, lt: addDay(requests[2].start, 7) } } }),
  ]);
  const donorTotal = donor.reduce((s, r) => s + r.count, 0);
  assert(donorTotal > 0, "Tuần mẫu không có lượt xem.");
  const byArticle = new Map<string, number>();
  const byDay = Array<number>(7).fill(0);
  for (const row of donor) {
    byArticle.set(row.articleId, (byArticle.get(row.articleId) ?? 0) + row.count);
    byDay[weekday(row.day)] += row.count;
  }
  const plans = requests.map(({ start, factor }) => {
    const end = addDay(start, 7);
    const before = existing.filter((r) => r.day >= start && r.day < end);
    const beforeTotal = before.reduce((s, r) => s + r.count, 0);
    const target = Math.max(beforeTotal, Math.round(donorTotal * factor));
    const lastDay = [addDay(start, 6), today].sort()[0];
    const eligible = articles.filter((a) => byArticle.has(a.id) && new Date((a.publishedAt ?? a.createdAt).getTime() + 7 * 3600_000).toISOString().slice(0, 10) <= lastDay);
    assert(eligible.length > 0, "Không có bài viết phù hợp tuần mẫu.");
    const eligibleWeight = eligible.reduce((s, a) => s + (byArticle.get(a.id) ?? 0), 0);
    const deficits = eligible.map((a) => Math.max(0, target * (byArticle.get(a.id) ?? 0) / eligibleWeight - before.filter((r) => r.articleId === a.id).reduce((s, r) => s + r.count, 0)));
    const additions = allocate(target - beforeTotal, deficits);
    const deltas: { articleId: string; day: string; count: number }[] = [];
    eligible.forEach((a, i) => {
      if (!additions[i]) return;
      const firstDay = new Date((a.publishedAt ?? a.createdAt).getTime() + 7 * 3600_000).toISOString().slice(0, 10);
      const days = Array.from({ length: 7 }, (_, n) => addDay(start, n)).filter((d) => d >= firstDay && d <= today);
      assert(days.length > 0);
      const articleWeights = days.map((d) => donor.filter((r) => r.articleId === a.id && weekday(r.day) === weekday(d)).reduce((s, r) => s + r.count, 0));
      const daily = allocate(additions[i], articleWeights.some((n) => n > 0) ? articleWeights : days.map((d) => byDay[weekday(d)]));
      days.forEach((day, j) => { if (daily[j]) deltas.push({ articleId: a.id, day, count: daily[j] }); });
    });
    assert.equal(deltas.reduce((s, d) => s + d.count, 0), target - beforeTotal);
    assert(deltas.every((d) => d.day >= start && d.day < end && d.day <= today));
    return { start, beforeTotal, target, added: target - beforeTotal, before, deltas };
  });
  return { donorStart, donorTotal, donor, articleTotalsBefore: articles.map(({ id, viewCount }) => ({ id, viewCount })), plans };
}

async function main() {
  const summary = (data: Awaited<ReturnType<typeof prepare>>) => ({ donorStart: data.donorStart, donorTotal: data.donorTotal, weeks: data.plans.map(({ start, beforeTotal, target, added, deltas }) => ({ start, before: beforeTotal, after: target, added, articles: new Set(deltas.map((d) => d.articleId)).size })) });
  if (!process.argv.includes("--apply")) { console.log(JSON.stringify({ mode: "preview", ...summary(await prepare(db)) }, null, 2)); return; }
  const applied = await db.$transaction(async (tx) => {
    const data = await prepare(tx);
    const deltas = data.plans.flatMap((p) => p.deltas);
    if (deltas.length) {
      await tx.$executeRaw(Prisma.sql`INSERT INTO "ArticleViewDay" ("articleId", "day", "count") VALUES ${Prisma.join(deltas.map((d) => Prisma.sql`(${d.articleId}, ${d.day}, ${d.count})`))} ON CONFLICT ("articleId", "day") DO UPDATE SET "count" = "ArticleViewDay"."count" + EXCLUDED."count"`);
      const perArticle = new Map<string, number>();
      for (const d of deltas) perArticle.set(d.articleId, (perArticle.get(d.articleId) ?? 0) + d.count);
      await tx.$executeRaw(Prisma.sql`UPDATE "Article" AS a SET "viewCount" = a."viewCount" + v.n FROM (VALUES ${Prisma.join([...perArticle].map(([id, n]) => Prisma.sql`(${id}::text, ${n}::integer)`))}) AS v(id, n) WHERE a.id = v.id`);
    }
    for (const plan of data.plans) {
      const actual = await tx.articleViewDay.aggregate({ where: { day: { gte: plan.start, lt: addDay(plan.start, 7) } }, _sum: { count: true } });
      assert.equal(actual._sum.count, plan.target);
    }
    const afterArticles = await tx.article.findMany({ where: { id: { in: data.articleTotalsBefore.map((a) => a.id) } }, select: { id: true, viewCount: true } });
    const expectedIncrease = data.plans.reduce((s, p) => s + p.added, 0);
    assert.equal(afterArticles.reduce((s, a) => s + a.viewCount, 0) - data.articleTotalsBefore.reduce((s, a) => s + a.viewCount, 0), expectedIncrease);
    await tx.siteSetting.create({ data: { key: auditKey, value: JSON.stringify({ createdAt: new Date().toISOString(), origin: "synthetic-source-records", method: "Weekly totals follow the recent donor week, including the ongoing week without prorating; article/weekday allocation follows donor shares within elapsed days.", ...data }) } });
    return summary(data);
  }, { isolationLevel: "Serializable", timeout: 120_000, maxWait: 10_000 });
  // Read back from the normal data connection after commit.
  const verified = [];
  for (const week of applied.weeks) {
    const result = await db.articleViewDay.aggregate({ where: { day: { gte: week.start, lt: addDay(week.start, 7) } }, _sum: { count: true } });
    assert((result._sum.count ?? 0) >= week.after);
    verified.push({ start: week.start, views: result._sum.count });
  }
  console.log(JSON.stringify({ mode: "applied-and-verified", ...applied, verified, auditKey }, null, 2));
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => db.$disconnect());
