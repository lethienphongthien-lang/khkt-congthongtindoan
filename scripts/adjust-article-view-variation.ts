// node --env-file=.env --import tsx scripts/adjust-article-view-variation.ts [--apply]
// Adjusts only the synthetic contribution recorded by rebalance-article-views.ts.
import assert from "node:assert/strict";
import { Prisma } from "@prisma/client";
import { db } from "../src/lib/db";

const previousKey = "insights.article-view-rebalance.2026-11-10.v1";
const auditKey = "insights.article-view-rebalance.2026-11-10.v2";
const targets = [{ start: "2026-10-26", total: 978 }, { start: "2026-11-02", total: 1316 }, { start: "2026-11-09", total: 1102 }];
type View = { articleId: string; day: string; count: number };
type Previous = { plans: { start: string; deltas: View[] }[] };
const endOfWeek = (start: string) => new Date(Date.parse(start) + 7 * 86_400_000).toISOString().slice(0, 10);

function allocate(total: number, weights: number[]) {
  assert(Number.isSafeInteger(total) && total >= 0);
  const sum = weights.reduce((a, b) => a + b, 0);
  assert(sum > 0 && weights.every((n) => Number.isSafeInteger(n) && n > 0));
  const shares = weights.map((n) => total * n / sum);
  const counts = shares.map(Math.floor);
  const remainder = total - counts.reduce((a, b) => a + b, 0);
  const order = shares.map((n, i) => ({ i, fraction: n - counts[i] })).sort((a, b) => b.fraction - a.fraction || a.i - b.i);
  for (const { i } of order.slice(0, remainder)) counts[i]++;
  assert.equal(counts.reduce((a, b) => a + b, 0), total);
  return counts;
}

async function prepare(tx: Prisma.TransactionClient) {
  assert(!await tx.siteSetting.findUnique({ where: { key: auditKey } }), "Đã điều chỉnh đợt này; không chạy lặp.");
  const prior = await tx.siteSetting.findUniqueOrThrow({ where: { key: previousKey } });
  const previous = JSON.parse(prior.value) as Previous;
  const existing = await tx.articleViewDay.findMany({ where: { day: { gte: targets[0].start, lt: endOfWeek(targets[2].start) } } });
  const today = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
  const plans = targets.map(({ start, total }) => {
    const old = previous.plans.find((p) => p.start === start);
    assert(old && old.deltas.length, "Thiếu nhật ký của phần dữ liệu đã bổ sung.");
    const before = existing.filter((r) => r.day >= start && r.day < endOfWeek(start));
    const beforeTotal = before.reduce((s, r) => s + r.count, 0);
    const oldSynthetic = old.deltas.reduce((s, r) => s + r.count, 0);
    const baseline = beforeTotal - oldSynthetic;
    assert(baseline >= 0 && total >= baseline, "Không được giảm vào phần dữ liệu ngoài đợt bổ sung.");
    const counts = allocate(total - baseline, old.deltas.map((d) => d.count));
    const adjustments = old.deltas.map((d, i) => {
      assert(d.day >= start && d.day < endOfWeek(start) && d.day <= today);
      const current = before.find((r) => r.articleId === d.articleId && r.day === d.day);
      assert(current && current.count >= d.count, "Bản ghi gốc đã thay đổi; dừng để bảo toàn số liệu.");
      return { articleId: d.articleId, day: d.day, before: current.count, oldSynthetic: d.count, newSynthetic: counts[i], delta: counts[i] - d.count };
    });
    assert.equal(adjustments.reduce((s, d) => s + d.delta, beforeTotal), total);
    return { start, beforeTotal, target: total, baseline, adjustments };
  });
  const donor = await tx.articleViewDay.aggregate({ where: { day: { gte: "2026-10-19", lt: targets[0].start } }, _sum: { count: true } });
  const sequence = [donor._sum.count ?? 0, ...plans.map((p) => p.target)];
  const changes = plans.map((p, i) => ({ start: p.start, deltaFromPreviousWeek: sequence[i + 1] - sequence[i] }));
  assert(changes.every((c) => Math.abs(c.deltaFromPreviousWeek) > 150), "Chênh lệch chưa vượt 150 lượt mỗi tuần.");
  const articleIds = [...new Set(plans.flatMap((p) => p.adjustments.map((d) => d.articleId)))];
  const articleTotalsBefore = await tx.article.findMany({ where: { id: { in: articleIds } }, select: { id: true, viewCount: true } });
  return { plans, changes, articleTotalsBefore };
}

async function main() {
  const summary = (data: Awaited<ReturnType<typeof prepare>>) => data.plans.map((p, i) => ({ start: p.start, before: p.beforeTotal, after: p.target, deltaFromPreviousWeek: data.changes[i].deltaFromPreviousWeek }));
  if (!process.argv.includes("--apply")) { console.log(JSON.stringify({ mode: "preview", weeks: summary(await prepare(db)) }, null, 2)); return; }
  const applied = await db.$transaction(async (tx) => {
    const data = await prepare(tx);
    const adjustments = data.plans.flatMap((p) => p.adjustments).filter((d) => d.delta !== 0);
    const affected = await tx.$executeRaw(Prisma.sql`UPDATE "ArticleViewDay" AS a SET "count" = a."count" + v.delta FROM (VALUES ${Prisma.join(adjustments.map((d) => Prisma.sql`(${d.articleId}::text, ${d.day}::text, ${d.delta}::integer)`))}) AS v(id, day, delta) WHERE a."articleId" = v.id AND a.day = v.day AND a."count" + v.delta >= 0`);
    assert.equal(affected, adjustments.length);
    const perArticle = new Map<string, number>();
    for (const d of adjustments) perArticle.set(d.articleId, (perArticle.get(d.articleId) ?? 0) + d.delta);
    const affectedArticles = await tx.$executeRaw(Prisma.sql`UPDATE "Article" AS a SET "viewCount" = a."viewCount" + v.delta FROM (VALUES ${Prisma.join([...perArticle].map(([id, delta]) => Prisma.sql`(${id}::text, ${delta}::integer)`))}) AS v(id, delta) WHERE a.id = v.id AND a."viewCount" + v.delta >= 0`);
    assert.equal(affectedArticles, perArticle.size);
    for (const p of data.plans) {
      const result = await tx.articleViewDay.aggregate({ where: { day: { gte: p.start, lt: endOfWeek(p.start) } }, _sum: { count: true } });
      assert.equal(result._sum.count, p.target);
    }
    const after = await tx.article.findMany({ where: { id: { in: data.articleTotalsBefore.map((a) => a.id) } }, select: { id: true, viewCount: true } });
    for (const a of data.articleTotalsBefore) assert.equal(after.find((r) => r.id === a.id)?.viewCount, a.viewCount + (perArticle.get(a.id) ?? 0));
    await tx.siteSetting.create({ data: { key: auditKey, value: JSON.stringify({ createdAt: new Date().toISOString(), origin: "synthetic-source-records", previousKey, ...data }) } });
    return summary(data);
  }, { isolationLevel: "Serializable", timeout: 120_000, maxWait: 10_000 });
  for (const week of applied) {
    const readback = await db.articleViewDay.aggregate({ where: { day: { gte: week.start, lt: endOfWeek(week.start) } }, _sum: { count: true } });
    assert((readback._sum.count ?? 0) >= week.after);
  }
  console.log(JSON.stringify({ mode: "applied-and-verified", weeks: applied, auditKey }, null, 2));
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => db.$disconnect());
