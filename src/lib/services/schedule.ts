import "server-only";
import { db } from "@/lib/db";
import { weekRange, type SchoolCalendar } from "@/lib/school-calendar";

const DAY = 86400_000;
const VN = 7 * 3600_000;
const WEEKDAY = ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"];
const iso = (d: Date) => new Date(d.getTime() + VN).toISOString().slice(0, 10);

export type ScheduleDay = { date: string; label: string; items: { id: string; time: string | null; content: string; assignee: string | null; place: string | null }[] };

/** Lịch công tác của một tuần, chia theo từng ngày (đủ 7 ngày, ngày trống có mảng rỗng). */
export async function getWeekSchedule(cal: SchoolCalendar, week: number) {
  const range = weekRange(cal, week);
  if (!range) return null;
  const schedule = await db.weeklySchedule.findUnique({
    where: { startYear_week: { startYear: cal.startYear, week } },
    include: { items: { orderBy: [{ date: "asc" }, { sortOrder: "asc" }, { time: "asc" }, { createdAt: "asc" }] } },
  });
  const days: ScheduleDay[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(range.from.getTime() + i * DAY);
    const v = new Date(d.getTime() + VN);
    return {
      date: iso(d), label: `${WEEKDAY[v.getUTCDay()]}, ${String(v.getUTCDate()).padStart(2, "0")}/${String(v.getUTCMonth() + 1).padStart(2, "0")}`,
      items: (schedule?.items ?? []).filter((it) => iso(it.date) === iso(d)).map((it) => ({ id: it.id, time: it.time, content: it.content, assignee: it.assignee, place: it.place })),
    };
  });
  return { published: !!schedule?.published, itemCount: schedule?.items.length ?? 0, days, range };
}
