/** Lịch năm học tính theo TUẦN (Tuần 1 bắt đầu từ một ngày do Admin đặt). Thuần hàm, dùng được ở client lẫn server. */
export type SchoolCalendar = { startYear: number; week1Start: string; sem1Weeks: number; totalWeeks: number };

const VN = 7 * 3600_000;
const DAY = 86400_000;
const pad = (n: number) => String(n).padStart(2, "0");
/** 00:00 giờ VN của ngày yyyy-MM-dd. */
const midnight = (iso: string) => { const [y, m, d] = iso.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d) - VN); };
const fmtDM = (d: Date) => { const v = new Date(d.getTime() + VN); return `${pad(v.getUTCDate())}/${pad(v.getUTCMonth() + 1)}`; };

export const DEFAULT_SEM1_WEEKS = 18;
export const DEFAULT_TOTAL_WEEKS = 35;
export const defaultCalendar = (startYear: number): SchoolCalendar => ({ startYear, week1Start: `${startYear}-09-05`, sem1Weeks: DEFAULT_SEM1_WEEKS, totalWeeks: DEFAULT_TOTAL_WEEKS });

export const yearLabel = (y: number) => `${y}–${y + 1}`;

export type Range = { from: Date; to: Date }; // `to` là cận trên loại trừ

/** Khoảng của cả năm học: 01/09 năm bắt đầu → 01/09 năm sau (gồm cả những ngày trước Tuần 1 và nghỉ hè). */
export function yearRange(c: SchoolCalendar): Range {
  const w1 = midnight(c.week1Start);
  const sep1 = midnight(`${c.startYear}-09-01`);
  return { from: w1 < sep1 ? w1 : sep1, to: midnight(`${c.startYear + 1}-09-01`) };
}

export function weekRange(c: SchoolCalendar, n: number): Range | null {
  if (!Number.isInteger(n) || n < 1 || n > c.totalWeeks) return null;
  const from = new Date(midnight(c.week1Start).getTime() + (n - 1) * 7 * DAY);
  return { from, to: new Date(from.getTime() + 7 * DAY) };
}

export function semesterRange(c: SchoolCalendar, sem: 1 | 2): Range {
  const y = yearRange(c);
  const split = weekRange(c, c.sem1Weeks + 1)?.from ?? y.to;
  return sem === 1 ? { from: y.from, to: split } : { from: split, to: y.to };
}

export const weekLabel = (c: SchoolCalendar, n: number) => {
  const r = weekRange(c, n)!;
  return `Tuần ${n} (${fmtDM(r.from)} – ${fmtDM(new Date(r.to.getTime() - DAY))})`;
};

/** Tuần hiện tại của năm học (null nếu đang ngoài các tuần học, ví dụ nghỉ hè). */
export function currentWeek(c: SchoolCalendar, now: Date = new Date()): number | null {
  const n = Math.floor((now.getTime() - midnight(c.week1Start).getTime()) / (7 * DAY)) + 1;
  return n >= 1 && n <= c.totalWeeks ? n : null;
}

/** Năm học (năm bắt đầu) chứa thời điểm `d` theo mốc 01/09. */
export function schoolYearOf(d: Date = new Date()): number {
  const v = new Date(d.getTime() + VN);
  return v.getUTCMonth() >= 8 ? v.getUTCFullYear() : v.getUTCFullYear() - 1;
}

/** Tham số lọc: `nh` = năm học (2026; bỏ trống = năm học hiện tại), `tuan` = "" (cả năm) | "hk1" | "hk2" | "1".."N". Luôn trả về một khoảng thời gian. */
export function rangeFromParams(cals: SchoolCalendar[], nh?: string | null, tuan?: string | null): Range & { label: string } {
  const given = Number(nh);
  const y = nh && Number.isInteger(given) ? given : schoolYearOf();
  const c = cals.find((x) => x.startYear === y) ?? defaultCalendar(y);
  if (tuan === "hk1") return { ...semesterRange(c, 1), label: `Học kỳ 1 · Năm học ${yearLabel(y)}` };
  if (tuan === "hk2") return { ...semesterRange(c, 2), label: `Học kỳ 2 · Năm học ${yearLabel(y)}` };
  const n = Number(tuan);
  if (tuan && Number.isInteger(n)) {
    const r = weekRange(c, n);
    if (r) return { ...r, label: `${weekLabel(c, n)} · Năm học ${yearLabel(y)}` };
  }
  return { ...yearRange(c), label: `Năm học ${yearLabel(y)}` };
}
