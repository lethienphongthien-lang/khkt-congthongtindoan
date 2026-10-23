// Tính khoảng thời gian thi đua theo giờ Việt Nam (UTC+7). Dùng được ở cả server và client.
// Tuần / học kỳ / năm học tính theo LỊCH NĂM HỌC (Tuần 1 bắt đầu từ ngày Admin đặt, xem school-calendar.ts); tháng theo lịch dương.
import { currentWeek, defaultCalendar, semesterRange, weekLabel, weekRange, yearLabel, yearRange, schoolYearOf, type SchoolCalendar } from "./school-calendar";
/** Điểm thi đua tối đa của một Chi đoàn trong một tuần. */
export const EMULATION_WEEK_MAX = 105;
export type PeriodType = "week" | "month" | "semester" | "year";
export const PERIOD_LABEL: Record<PeriodType, string> = { week: "Tuần", month: "Tháng", semester: "Học kỳ", year: "Năm học" };

const VN = 7 * 3600_000;
/** 00:00 giờ VN của ngày (y, m0, d) dưới dạng instant. */
const vnMidnight = (y: number, m0: number, d: number) => new Date(Date.UTC(y, m0, d) - VN);
const pad = (n: number) => String(n).padStart(2, "0");

/** Năm bắt đầu của năm học chứa thời điểm `d` (năm học: 1/9 – 31/8). */
export function schoolYearStart(d: Date) {
  const v = new Date(d.getTime() + VN);
  return v.getUTCMonth() >= 8 ? v.getUTCFullYear() : v.getUTCFullYear() - 1;
}

export const monthValue = (d: Date) => { const v = new Date(d.getTime() + VN); return `${v.getUTCFullYear()}-${pad(v.getUTCMonth() + 1)}`; };
export type Period = { type: PeriodType; value: string; from: Date; to: Date; label: string };

const calOf = (cals: SchoolCalendar[] | undefined, y: number) => cals?.find((c) => c.startYear === y) ?? defaultCalendar(y);

/** `to` là cận trên loại trừ. Trả null nếu giá trị không hợp lệ.
 *  Giá trị: tuần `2026-T03` (Tuần 3 năm học 2026–2027), tháng `2026-10`, học kỳ `2026-1`, năm học `2026`. */
export function resolvePeriod(type: PeriodType, value: string, cals?: SchoolCalendar[]): Period | null {
  if (type === "week") {
    const m = value.match(/^(\d{4})-T(\d{1,2})$/);
    if (!m) return null;
    const c = calOf(cals, +m[1]);
    const r = weekRange(c, +m[2]);
    return r ? { type, value, ...r, label: `${weekLabel(c, +m[2])} · Năm học ${yearLabel(+m[1])}` } : null;
  }
  if (type === "month") {
    const m = value.match(/^(\d{4})-(\d{2})$/);
    if (!m || +m[2] < 1 || +m[2] > 12) return null;
    return { type, value, from: vnMidnight(+m[1], +m[2] - 1, 1), to: vnMidnight(+m[1], +m[2], 1), label: `Tháng ${+m[2]}/${m[1]}` };
  }
  if (type === "semester") {
    const m = value.match(/^(\d{4})-([12])$/);
    if (!m) return null;
    const y = +m[1];
    const r = semesterRange(calOf(cals, y), m[2] === "1" ? 1 : 2);
    return { type, value, ...r, label: `Học kỳ ${m[2]} · Năm học ${yearLabel(y)}` };
  }
  const m = value.match(/^(\d{4})$/);
  if (!m) return null;
  const y = +m[1];
  return { type, value, ...yearRange(calOf(cals, y)), label: `Năm học ${yearLabel(y)}` };
}

export function currentValue(type: PeriodType, now = new Date(), cals?: SchoolCalendar[]) {
  const y = schoolYearOf(now);
  const c = calOf(cals, y);
  if (type === "week") return `${y}-T${String(currentWeek(c, now) ?? 1).padStart(2, "0")}`; // ngoài thời gian học: Tuần 1
  if (type === "month") return monthValue(now);
  if (type === "semester") return `${y}-${now < semesterRange(c, 2).from ? 1 : 2}`;
  return String(y);
}
