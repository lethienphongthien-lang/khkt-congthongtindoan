/** Năm học & niên khóa. Năm học bắt đầu từ 01/09 (giờ Việt Nam). Dùng được cả ở client lẫn server. */
export const SCHOOL_YEAR_START_MONTH = 9;
export const COURSE_YEARS = 3; // THPT: lớp 10 -> 12

/** Năm bắt đầu của năm học chứa thời điểm `d` (vd 06/10/2026 -> 2026; 15/06/2027 -> 2026). */
export function schoolYearStart(d: Date = new Date()): number {
  const vn = new Date(d.getTime() + 7 * 3600_000);
  return vn.getUTCMonth() + 1 >= SCHOOL_YEAR_START_MONTH ? vn.getUTCFullYear() : vn.getUTCFullYear() - 1;
}

/** Khối của Chi đoàn trong một năm học (10/11/12; >12 = đã ra trường; <10 = chưa vào học). */
export const gradeFor = (startYear: number, sy: number = schoolYearStart()) => 10 + sy - startYear;
export const startYearFor = (grade: number, sy: number = schoolYearStart()) => sy - (grade - 10);
export const cohortLabel = (startYear: number | null | undefined) => (startYear ? `${startYear}–${startYear + COURSE_YEARS}` : "");

/** Tách "10A1" -> { grade: 10, suffix: "A1" }; tên không bắt đầu bằng số khối thì trả null. */
export function parseClassName(name: string): { grade: number; suffix: string } | null {
  const m = name.trim().match(/^(10|11|12)\s*(.*)$/);
  return m ? { grade: Number(m[1]), suffix: m[2] } : null;
}
