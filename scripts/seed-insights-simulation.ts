// Run: node --env-file=.env --conditions=react-server --import tsx scripts/seed-insights-simulation.ts [--apply]
import { db } from "../src/lib/db";
import { weeklyInsights } from "../src/lib/services/insights";
import type { MetricKey, WeekRow } from "../src/lib/services/insights";

async function main() {
  const { rows, members } = await weeklyInsights(12);
  const targets = rows.slice(-3);
  const history = rows.slice(0, -3).filter((r) => r.checkins || r.gamePlays || r.articleViews || r.confessions || r.feedback || r.emulationAvg || r.volunteerDone);
  if (!history.length) throw new Error("Không có tuần lịch sử có dữ liệu để mô phỏng.");
  const today = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
  const elapsedDays = Math.floor((Date.parse(today) - Date.parse(targets[2].start)) / 86_400_000) + 1;
  const keys: MetricKey[] = ["activeMembers", "checkins", "gamePlayers", "gamePlays", "volunteerDone", "volunteerHours", "confessions", "feedback", "articleViews", "emulationAvg"];
  const simulated = targets.map((target, i) => {
    const source = history[Math.max(0, history.length - 3 + i) % history.length];
    const factor = [0.94, 1.07, 1.02][i] * (i === 2 ? elapsedDays / 7 : 1);
    const row: WeekRow = { ...target };
    for (const key of keys) row[key] = Math.max(0, Math.round(source[key] * factor));
    row.activeMembers = Math.min(members, row.activeMembers);
    row.checkins = Math.max(row.activeMembers, Math.min(row.activeMembers * (i === 2 ? elapsedDays : 7), row.checkins));
    row.gamePlayers = Math.min(members, row.gamePlayers);
    row.gamePlays = Math.max(row.gamePlayers, row.gamePlays);
    row.activeRate = members ? Math.round(row.activeMembers / members * 1000) / 10 : 0;
    return { ...row, sourceWeek: source.start };
  });
  const value = JSON.stringify({ version: 1, generatedAt: new Date().toISOString(), note: "Dữ liệu mô phỏng từ phân bố các tuần lịch sử; không phải hoạt động thực tế.", rows: simulated });
  console.log(JSON.stringify({ mode: process.argv.includes("--apply") ? "apply" : "preview", historicalWeeks: history.length, members, rows: simulated }, null, 2));
  if (process.argv.includes("--apply")) {
    await db.siteSetting.upsert({ where: { key: "insights.simulation.v1" }, create: { key: "insights.simulation.v1", value }, update: { value } });
    const saved = await db.siteSetting.findUniqueOrThrow({ where: { key: "insights.simulation.v1" } });
    if (saved.value !== value) throw new Error("Dữ liệu lưu không khớp.");
    console.log("Đã lưu và đọc lại thành công 3 tuần mô phỏng.");
  }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => db.$disconnect());
