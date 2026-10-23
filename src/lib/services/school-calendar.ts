import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import { defaultCalendar, schoolYearOf, type SchoolCalendar } from "@/lib/school-calendar";

/** Các năm học đã cấu hình + năm học hiện tại/kế tiếp (nếu chưa cấu hình thì dùng mặc định), mới nhất trước. */
export const loadCalendars = cache(async (): Promise<SchoolCalendar[]> => {
  const rows = await db.schoolYear.findMany({ orderBy: { startYear: "desc" } });
  const map = new Map<number, SchoolCalendar>(rows.map((r) => [r.startYear, { startYear: r.startYear, week1Start: r.week1Start, sem1Weeks: r.sem1Weeks, totalWeeks: r.totalWeeks }]));
  const sy = schoolYearOf();
  for (const y of [sy + 1, sy, sy - 1]) if (!map.has(y)) map.set(y, defaultCalendar(y));
  return [...map.values()].sort((a, b) => b.startYear - a.startYear);
});
