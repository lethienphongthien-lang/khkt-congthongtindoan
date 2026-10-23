import "server-only";
import { db } from "@/lib/db";
import { vnDay } from "@/lib/services/visits";

const VN = 7 * 3600_000;
const DAY = 86_400_000;
const addDays = (day: string, n: number) => new Date(new Date(`${day}T00:00:00Z`).getTime() + n * DAY).toISOString().slice(0, 10);
/** Thứ Hai của tuần chứa ngày `day` (YYYY-MM-DD). */
const mondayOf = (day: string) => addDays(day, -((new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7));
const dayOfDate = (d: Date) => new Date(d.getTime() + VN).toISOString().slice(0, 10);

export type WeekRow = {
  start: string; label: string;
  activeMembers: number; activeRate: number; checkins: number;
  gamePlayers: number; gamePlays: number;
  volunteerDone: number; volunteerHours: number;
  confessions: number; feedback: number; articleViews: number;
  emulationAvg: number;
};

export type MetricKey = Exclude<keyof WeekRow, "start" | "label">;
export const METRICS: { key: MetricKey; label: string; unit: string; hint: string }[] = [
  { key: "activeRate", label: "Tỉ lệ đoàn viên truy cập", unit: "%", hint: "Đoàn viên có truy cập hệ thống ít nhất 1 ngày trong tuần / tổng đoàn viên đang hoạt động" },
  { key: "checkins", label: "Lượt truy cập hằng ngày", unit: "", hint: "Tổng số ngày truy cập của tất cả đoàn viên trong tuần" },
  { key: "gamePlayers", label: "Số người chơi trò chơi", unit: "", hint: "Số đoàn viên hoàn thành ít nhất một lượt trò chơi trong tuần" },
  { key: "confessions", label: "Số confession gửi đến", unit: "", hint: "Confession ẩn danh gửi qua cổng thông tin trong tuần (kể cả chưa duyệt)" },
  { key: "articleViews", label: "Lượt xem bài viết", unit: "", hint: "Tổng lượt xem các bài viết trên cổng thông tin trong tuần (mỗi lần mở bài tính một lượt)" },
  { key: "feedback", label: "Số góp ý gửi đến", unit: "", hint: "Góp ý ẩn danh gửi qua cổng thông tin" },
  { key: "emulationAvg", label: "Điểm thi đua trung bình mỗi Chi đoàn", unit: "điểm", hint: "Tổng điểm thi đua ghi nhận trong tuần / số Chi đoàn" },
];

const ddmm = (day: string) => `${day.slice(8, 10)}/${day.slice(5, 7)}`;

export async function weeklyInsights(weeks: number) {
  const thisMonday = mondayOf(vnDay());
  const first = addDays(thisMonday, -7 * (weeks - 1));
  const from = new Date(new Date(`${first}T00:00:00Z`).getTime() - VN);
  const [members, depts, checkins, quizzes, vols, votes, feedback, records, viewDays] = await Promise.all([
    db.member.count({ where: { status: "ACTIVE", department: { isTeacher: false, graduatedAt: null } } }),
    db.department.count({ where: { isTeacher: false, graduatedAt: null } }),
    db.dailyCheckin.findMany({ where: { day: { gte: first } }, select: { memberId: true, day: true } }),
    db.quizAttempt.findMany({ where: { finishedAt: { gte: from } }, select: { memberId: true, finishedAt: true } }),
    db.volunteerRequest.findMany({ where: { status: "COMPLETED", completedAt: { gte: from } }, select: { completedAt: true, hours: true } }),
    db.confession.findMany({ where: { createdAt: { gte: from } }, select: { createdAt: true } }),
    db.feedback.findMany({ where: { createdAt: { gte: from } }, select: { createdAt: true } }),
    db.emulationRecord.findMany({ where: { recordedAt: { gte: from } }, select: { points: true, recordedAt: true } }),
    db.articleViewDay.findMany({ where: { day: { gte: first } }, select: { day: true, count: true } }),
  ]);
  const idx = (day: string) => Math.floor((new Date(`${mondayOf(day)}T00:00:00Z`).getTime() - new Date(`${first}T00:00:00Z`).getTime()) / (7 * DAY));
  const rows: WeekRow[] = Array.from({ length: weeks }, (_, i) => {
    const start = addDays(first, 7 * i);
    return { start, label: i === weeks - 1 ? "Tuần này" : ddmm(start), activeMembers: 0, activeRate: 0, checkins: 0, gamePlayers: 0, gamePlays: 0, volunteerDone: 0, volunteerHours: 0, confessions: 0, feedback: 0, articleViews: 0, emulationAvg: 0 };
  });
  const sets = {
    active: rows.map(() => new Set<string>()), game: rows.map(() => new Set<string>())
  };
  const ok = (i: number) => i >= 0 && i < weeks;
  for (const c of checkins) { const i = idx(c.day); if (ok(i)) { rows[i].checkins++; sets.active[i].add(c.memberId); } }
  for (const q of quizzes) { if (!q.finishedAt) continue; const i = idx(dayOfDate(q.finishedAt)); if (ok(i)) { rows[i].gamePlays++; sets.game[i].add(q.memberId); } }
  for (const v of vols) { if (!v.completedAt) continue; const i = idx(dayOfDate(v.completedAt)); if (ok(i)) { rows[i].volunteerDone++; rows[i].volunteerHours += v.hours; } }
  for (const v of votes) { const i = idx(dayOfDate(v.createdAt)); if (ok(i)) rows[i].confessions++; }
  for (const f of feedback) { const i = idx(dayOfDate(f.createdAt)); if (ok(i)) rows[i].feedback++; }
  for (const v of viewDays) { const i = idx(v.day); if (ok(i)) rows[i].articleViews += v.count; }
  const emu = rows.map(() => 0);
  for (const r of records) { const i = idx(dayOfDate(r.recordedAt)); if (ok(i)) emu[i] += r.points; }
  rows.forEach((r, i) => {
    r.activeMembers = sets.active[i].size;
    r.activeRate = members ? Math.round((r.activeMembers / members) * 1000) / 10 : 0;
    r.gamePlayers = sets.game[i].size;
    r.volunteerHours = Math.round(r.volunteerHours * 10) / 10;
    r.emulationAvg = depts ? Math.round((emu[i] / depts) * 10) / 10 : 0;
  });
  return { rows, members, depts };
}

/** So sánh trung bình các tuần trước và từ mốc triển khai. */
export function compareAt(rows: WeekRow[], cutoffDay: string) {
  const cut = mondayOf(cutoffDay);
  const before = rows.filter((r) => r.start < cut);
  const after = rows.filter((r) => r.start >= cut);
  if (!before.length || !after.length) return null;
  const mean = (a: WeekRow[], k: MetricKey) => a.reduce((s, r) => s + r[k], 0) / a.length;
  const sd = (a: WeekRow[], k: MetricKey) => { const m = mean(a, k); return a.length > 1 ? Math.sqrt(a.reduce((s, r) => s + (r[k] - m) ** 2, 0) / (a.length - 1)) : 0; };
  return {
    beforeWeeks: before.length, afterWeeks: after.length,
    items: METRICS.map((m) => {
      const b = mean(before, m.key), a = mean(after, m.key);
      const sb = sd(before, m.key), sa = sd(after, m.key);
      // Kiểm định t của Welch (cần ít nhất 2 tuần mỗi bên)
      let t: number | null = null;
      if (before.length > 1 && after.length > 1) {
        const se = Math.sqrt(sb ** 2 / before.length + sa ** 2 / after.length);
        t = se > 0 ? (a - b) / se : null;
      }
      return { ...m, before: b, after: a, sdBefore: sb, sdAfter: sa, change: b > 0 ? ((a - b) / b) * 100 : null, t };
    }),
  };
}

/** Mức tham gia của từng Chi đoàn trong 4 tuần gần nhất. */
export async function departmentEngagement() {
  const thisMonday = mondayOf(vnDay());
  const first = addDays(thisMonday, -21);
  const from = new Date(new Date(`${first}T00:00:00Z`).getTime() - VN);
  const [depts, checkins, quizzes, vols] = await Promise.all([
    db.department.findMany({ where: { isTeacher: false, graduatedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true, members: { where: { status: "ACTIVE" }, select: { id: true, user: { select: { mustChangePassword: true } } } } } }),
    db.dailyCheckin.findMany({ where: { day: { gte: first } }, select: { memberId: true, member: { select: { departmentId: true } } } }),
    db.quizAttempt.findMany({ where: { finishedAt: { gte: from } }, select: { memberId: true, member: { select: { departmentId: true } } } }),
    db.volunteerRequest.findMany({ where: { status: "COMPLETED", completedAt: { gte: from } }, select: { departmentId: true } }),
  ]);
  return depts.map((d) => {
    const active = new Set(checkins.filter((c) => c.member.departmentId === d.id).map((c) => c.memberId));
    const days = checkins.filter((c) => c.member.departmentId === d.id).length;
    const players = new Set(quizzes.filter((q) => q.member.departmentId === d.id).map((q) => q.memberId));
    const total = d.members.length;
    return {
      id: d.id, name: d.name, total,
      activated: d.members.filter((m) => !m.user.mustChangePassword).length,
      activatedRate: total ? Math.round((d.members.filter((m) => !m.user.mustChangePassword).length / total) * 100) : 0,
      activeRate: total ? Math.round((active.size / total) * 100) : 0,
      avgDays: total ? Math.round((days / total / 4) * 10) / 10 : 0,
      playerRate: total ? Math.round((players.size / total) * 100) : 0,
      volunteerDone: vols.filter((v) => v.departmentId === d.id).length,
    };
  });
}

export async function viewTotals() {
  const today = vnDay();
  const [all, week] = await Promise.all([
    db.article.aggregate({ where: { published: true }, _sum: { viewCount: true } }),
    db.articleViewDay.aggregate({ where: { day: { gte: mondayOf(today) } }, _sum: { count: true } }),
  ]);
  return { total: all._sum.viewCount ?? 0, thisWeek: week._sum.count ?? 0 };
}

export async function topArticles() {
  return db.article.findMany({ where: { published: true, viewCount: { gt: 0 } }, orderBy: { viewCount: "desc" }, take: 10, select: { id: true, title: true, slug: true, kind: true, viewCount: true } });
}

/** Số báo cáo Chi đoàn và số lần đăng ký tình nguyện của từng Chi đoàn trong một khoảng thời gian (năm học). */
export async function yearActivity(range: { from: Date; to: Date }) {
  const when = { gte: range.from, lt: range.to };
  const [depts, reports, vols] = await Promise.all([
    db.department.findMany({ where: { isTeacher: false, graduatedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.chapterReport.groupBy({ by: ["departmentId"], where: { createdAt: when }, _count: { _all: true } }),
    db.volunteerRequest.groupBy({ by: ["departmentId", "status"], where: { createdAt: when }, _count: { _all: true } }),
  ]);
  return depts.map((d) => {
    const v = vols.filter((x) => x.departmentId === d.id);
    const n = (st?: string) => v.filter((x) => !st || x.status === st).reduce((s, x) => s + x._count._all, 0);
    return {
      id: d.id, name: d.name,
      reports: reports.find((r) => r.departmentId === d.id)?._count._all ?? 0,
      registered: n(), completed: n("COMPLETED"), rejected: n("REJECTED"),
    };
  });
}
