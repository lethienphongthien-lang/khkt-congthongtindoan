import "server-only";
import { db } from "@/lib/db";
import { resolvePeriod, type Period } from "@/lib/emulation-period";
import { loadCalendars } from "@/lib/services/school-calendar";

export type WebDeptRow = { id: string; name: string; members: number; points: number; avg: number; rank: number };
export type WebTopRow = { id: string; name: string; department: string; points: number; rank: number };
export type WebRanking = { departments: WebDeptRow[]; top: WebTopRow[]; period: { type: string; value: string; label: string }; fallback: boolean };

/** Tên hiển thị công khai: giữ họ và tên, viết tắt tên đệm (Nguyễn Văn An → Nguyễn V. An) để bớt lộ danh tính học sinh. */
export function shortName(full: string) {
  const w = full.trim().split(/\s+/);
  if (w.length <= 2) return full.trim();
  return `${w[0]} ${w.slice(1, -1).map((x) => x.charAt(0).toUpperCase() + ".").join(" ")} ${w[w.length - 1]}`;
}

const rankOf = <T,>(rows: T[], same: (a: T, b: T) => boolean) => rows.map((r, i) => (i > 0 && same(rows[i - 1], r) ? 0 : i + 1)).reduce<number[]>((acc, v, i) => (acc.push(v === 0 ? acc[i - 1] : v), acc), []);

/**
 * Xếp hạng hoạt động trên web trong một kỳ. Điểm từ ba nguồn: chơi trò chơi (GAME), truy cập hệ thống mỗi ngày (DAILY) và tình nguyện do bí thư xác nhận hoàn thành (ACTIVITY).
 * Chi đoàn xếp theo điểm BÌNH QUÂN mỗi đoàn viên (công bằng giữa lớp đông và ít); kèm top cá nhân.
 */
export async function webRankingFor(period: Period, topN = 5): Promise<Omit<WebRanking, "fallback" | "period">> {
  const { from, to } = period;
  const [depts, sums, people] = await Promise.all([
    db.department.findMany({ where: { graduatedAt: null, isTeacher: false }, select: { id: true, name: true, _count: { select: { members: { where: { status: "ACTIVE" } } } } } }),
    db.$queryRaw<{ departmentId: string; sum: number }[]>`
      SELECT m."departmentId" AS "departmentId", COALESCE(SUM(p.points), 0)::int AS sum
      FROM "PointTransaction" p JOIN "Member" m ON m.id = p."memberId"
      WHERE p.type IN ('GAME', 'DAILY', 'ACTIVITY') AND p."createdAt" >= ${from} AND p."createdAt" < ${to}
      GROUP BY m."departmentId"`,
    db.$queryRaw<{ id: string; fullName: string; department: string; sum: number }[]>`
      SELECT m.id AS id, m."fullName" AS "fullName", d.name AS department, SUM(p.points)::int AS sum
      FROM "PointTransaction" p JOIN "Member" m ON m.id = p."memberId" JOIN "Department" d ON d.id = m."departmentId"
      WHERE p.type IN ('GAME', 'DAILY', 'ACTIVITY') AND p."createdAt" >= ${from} AND p."createdAt" < ${to} AND d."isTeacher" = false
      GROUP BY m.id, m."fullName", d.name
      HAVING SUM(p.points) > 0
      ORDER BY sum DESC, m."fullName" ASC
      LIMIT ${topN}`,
  ]);
  const pts = new Map(sums.map((r) => [r.departmentId, r.sum]));
  const rows = depts.map((d) => {
    const members = d._count.members, points = pts.get(d.id) ?? 0;
    return { id: d.id, name: d.name, members, points, avg: Math.round((points / Math.max(1, members)) * 10) / 10, rank: 0 };
  }).sort((a, b) => b.avg - a.avg || b.points - a.points || a.name.localeCompare(b.name, "vi", { numeric: true }));
  const ranks = rankOf(rows, (a, b) => a.avg === b.avg);
  rows.forEach((r, i) => { r.rank = ranks[i]; });
  const topRanks = rankOf(people, (a, b) => a.sum === b.sum);
  const top = people.map((p, i) => ({ id: p.id, name: shortName(p.fullName), department: p.department, points: p.sum, rank: topRanks[i] }));
  return { departments: rows, top };
}

/**
 * Xếp hạng của tuần `value` (ví dụ 2026-T07). Tuần này chưa ai có điểm thì lùi về tuần gần nhất có điểm (tối đa 4 tuần).
 * Với các kỳ khác (tháng, học kỳ, năm) thì dùng đúng kỳ được chọn, không lùi.
 */
export async function webRanking(type: Period["type"], value: string, topN = 5): Promise<WebRanking | null> {
  const cals = await loadCalendars();
  const period = resolvePeriod(type, value, cals);
  if (!period) return null;
  let result = await webRankingFor(period, topN);
  let used = period, fallback = false;
  const m = type === "week" ? value.match(/^(\d{4})-T(\d+)$/) : null;
  if (m && !result.departments.some((d) => d.points > 0)) {
    for (let w = +m[2] - 1; w >= Math.max(1, +m[2] - 4); w--) {
      const p = resolvePeriod("week", `${m[1]}-T${String(w).padStart(2, "0")}`, cals);
      if (!p) continue;
      const r = await webRankingFor(p, topN);
      if (r.departments.some((d) => d.points > 0)) { result = r; used = p; fallback = true; break; }
    }
  }
  return { ...result, period: { type: used.type, value: used.value, label: used.label }, fallback };
}
