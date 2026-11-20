import { getLocale, getT } from "@/lib/i18n/server";
import { requireRole } from "@/lib/auth/session";
import { currentWeek, defaultCalendar, schoolYearOf, weekLabel, yearLabel } from "@/lib/school-calendar";
import { loadCalendars } from "@/lib/services/school-calendar";
import { getWeekSchedule } from "@/lib/services/schedule";
import { PageHeader } from "@/components/ui/misc";
import { WeekPicker } from "@/components/schedule/week-picker";
import { ScheduleEditor } from "@/components/schedule/schedule-editor";

export async function generateMetadata() { return { title: (await getT())("dash.sch.title") }; }

export default async function SchedulePage({ searchParams }: { searchParams: Promise<{ nh?: string; tuan?: string }> }) {
  const t = await getT();
  const locale = await getLocale();
  await requireRole(["ADMIN"]);
  const sp = await searchParams;
  const calendars = await loadCalendars();
  const year = Number(sp.nh) || schoolYearOf();
  const cal = calendars.find((c) => c.startYear === year) ?? defaultCalendar(year);
  // Chưa có/ sai tuần: dùng tuần hiện tại luôn (không chuyển hướng, tránh nháy khung chờ hai lần)
  const asked = Number(sp.tuan);
  const week = Number.isInteger(asked) && asked >= 1 && asked <= cal.totalWeeks ? asked : currentWeek(cal) ?? 1;
  const data = (await getWeekSchedule(cal, week))!;
  return (
    <>
      <PageHeader title={t("dash.sch.title")} stackActions description={t("dash.sch.desc", { week: weekLabel(cal, week, t("misc.week")), year: yearLabel(year) })}
        actions={<WeekPicker className="" calendars={calendars.some((c) => c.startYear === year) ? calendars : [...calendars, cal].sort((a, b) => b.startYear - a.startYear)} year={year} week={week} />} />
      <ScheduleEditor year={year} week={week} published={data.published} itemCount={data.itemCount} days={data.days} publicHref={`/lich-cong-tac?nh=${year}&tuan=${week}`} />
    </>
  );
}
