import "server-only";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { resolvePeriod, type Period, type PeriodType } from "@/lib/emulation-period";

export type RankRow = { id: string; name: string; members: number; schoolScore: number; total: number; rank: number };

/**
 * Điểm thi đua Chi đoàn trong kỳ = điểm do Admin / Ban chấp hành ghi nhận theo tuần (có trần mỗi tuần).
 * Điểm hoạt động của học sinh trên web (chơi trò chơi, truy cập hằng ngày) được xếp hạng riêng, xem web-ranking.ts.
 */
export async function emulationRanking(period: Period): Promise<RankRow[]> {
  const { from, to } = period;
  const [departments, school] = await Promise.all([
    db.department.findMany({ where: { graduatedAt: null, isTeacher: false }, select: { id: true, name: true, _count: { select: { members: { where: { status: "ACTIVE" } } } } } }),
    db.emulationRecord.groupBy({ by: ["departmentId"], where: { recordedAt: { gte: from, lt: to } }, _sum: { points: true } }),
  ]);
  const sch = new Map(school.map((r) => [r.departmentId, r._sum.points ?? 0]));
  const rows = departments.map((d) => {
    const schoolScore = sch.get(d.id) ?? 0;
    return { id: d.id, name: d.name, members: d._count.members, schoolScore, total: schoolScore, rank: 0 };
  }).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "vi", { numeric: true }));
  // Đồng hạng khi cùng điểm thi đua
  rows.forEach((r, i) => { r.rank = i > 0 && rows[i - 1].total === r.total ? rows[i - 1].rank : i + 1; });
  return rows;
}

/** Bản có cache 5 phút cho các trang công khai (nhiều người xem, dữ liệu ít đổi). */
export const cachedRanking = unstable_cache(
  async (type: PeriodType, value: string) => {
    const { loadCalendars } = await import("@/lib/services/school-calendar");
    const period = resolvePeriod(type, value, await loadCalendars());
    return period ? emulationRanking(period) : [];
  },
  ["emulation-ranking"],
  { revalidate: 300 },
);
