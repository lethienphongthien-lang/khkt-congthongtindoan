import "server-only";
import { db } from "@/lib/db";

const gradeOfName = (name: string) => name.match(/\b(10|11|12)/)?.[1] ?? name.match(/(10|11|12)/)?.[1] ?? "Khác";
const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

/** Số liệu cho trang Tổng quan của Admin: cơ cấu theo khối/Chi đoàn, giới tính, kết nạp theo tháng, việc cần xử lý. */
export async function adminOverview() {
  const now = new Date();
  const joinFrom = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const [departments, groups, genders, joins, pendingArticles, newFeedback] = await Promise.all([
    db.department.findMany({ where: { graduatedAt: null, isTeacher: false }, select: { id: true, name: true } }),
    db.member.groupBy({ by: ["departmentId", "isDoanVien"], where: { status: "ACTIVE" }, _count: true }),
    db.member.groupBy({ by: ["gender"], where: { status: "ACTIVE", department: { isTeacher: false } }, _count: true }),
    db.member.findMany({ where: { status: "ACTIVE", isDoanVien: true, joinedAt: { gte: joinFrom }, department: { isTeacher: false } }, select: { joinedAt: true } }),
    db.article.count({ where: { published: false, author: { role: "SECRETARY" } } }),
    db.feedback.count({ where: { status: "NEW" } }),
  ]);

  const perDept = new Map(departments.map((d) => [d.id, { id: d.id, name: d.name, doanVien: 0, thanhNien: 0 }]));
  for (const g of groups) { const d = perDept.get(g.departmentId); if (d) (g.isDoanVien ? (d.doanVien = g._count) : (d.thanhNien = g._count)); }
  const depts = [...perDept.values()].map((d) => ({ ...d, total: d.doanVien + d.thanhNien, rate: d.doanVien + d.thanhNien ? Math.round((d.doanVien / (d.doanVien + d.thanhNien)) * 100) : 0 }));

  const grades = new Map<string, { grade: string; doanVien: number; thanhNien: number }>();
  for (const d of depts) {
    const key = gradeOfName(d.name);
    const g = grades.get(key) ?? { grade: key === "Khác" ? "Khác" : `Khối ${key}`, doanVien: 0, thanhNien: 0 };
    g.doanVien += d.doanVien; g.thanhNien += d.thanhNien; grades.set(key, g);
  }
  const byGrade = [...grades.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);

  const joinKeys: string[] = [];
  for (let i = 5; i >= 0; i--) joinKeys.push(monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1)));
  const joinCount = new Map(joinKeys.map((k) => [k, 0]));
  for (const j of joins) { const k = j.joinedAt ? monthKey(j.joinedAt) : ""; if (joinCount.has(k)) joinCount.set(k, (joinCount.get(k) ?? 0) + 1); }
  const joinTrend = joinKeys.map((k) => ({ month: `T${Number(k.slice(5))}/${k.slice(2, 4)}`, value: joinCount.get(k) ?? 0 }));

  const g = (name: string) => genders.filter((x) => x.gender === name).reduce((n, x) => n + x._count, 0);
  const male = g("Nam"), female = g("Nữ");
  const other = genders.reduce((n, x) => n + x._count, 0) - male - female;

  const doanVien = depts.reduce((n, d) => n + d.doanVien, 0);
  const thanhNien = depts.reduce((n, d) => n + d.thanhNien, 0);
  return { doanVien, thanhNien, students: doanVien + thanhNien, departments: depts.length, depts, byGrade, joinTrend, gender: { male, female, other }, pendingArticles, newFeedback };
}
