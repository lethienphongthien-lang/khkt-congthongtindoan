"use client";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Select } from "@/components/ui/form";
import { currentWeek, schoolYearOf, weekLabel, yearLabel, type SchoolCalendar } from "@/lib/school-calendar";

/** Chọn Năm học + một Tuần cụ thể (có nút tuần trước/sau). Dùng cho lịch công tác. */
export function WeekPicker({ calendars, year, week, className = "mb-4" }: { calendars: SchoolCalendar[]; year: number; week: number; className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const cal = calendars.find((c) => c.startYear === year) ?? calendars[0];
  const nowWeek = currentWeek(cal);
  const go = (y: number, w: number) => router.replace(`${pathname}?nh=${y}&tuan=${w}`);
  const cur = schoolYearOf();
  return (
    <div className={`no-print flex w-full flex-wrap items-center gap-2 sm:w-auto ${className}`}>
      <Select aria-label="Năm học" value={year} onChange={(e) => { const y = Number(e.target.value); const c = calendars.find((x) => x.startYear === y)!; go(y, Math.min(week, c.totalWeeks)); }} className="w-full sm:w-auto sm:min-w-36">
        {calendars.map((c) => <option key={c.startYear} value={c.startYear}>Năm học {yearLabel(c.startYear)}{c.startYear === cur ? " (hiện tại)" : ""}</option>)}
      </Select>
      {/* ‹ Tuần › : nút chuyển tuần hai bên ô chọn tuần */}
      <div className="flex w-full items-center gap-1 sm:w-auto">
        <button type="button" aria-label="Tuần trước" disabled={week <= 1} onClick={() => go(year, week - 1)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-border bg-white/85 hover:bg-slate-50 disabled:opacity-40"><ChevronLeft className="size-4" /></button>
        <Select aria-label="Tuần" value={week} onChange={(e) => go(year, Number(e.target.value))} className="w-auto min-w-0 flex-1 sm:min-w-52">
          <optgroup label="Học kỳ 1">{Array.from({ length: cal.sem1Weeks }, (_, i) => <option key={i} value={i + 1}>{weekLabel(cal, i + 1)}{i + 1 === nowWeek ? " · hiện tại" : ""}</option>)}</optgroup>
          <optgroup label="Học kỳ 2">{Array.from({ length: cal.totalWeeks - cal.sem1Weeks }, (_, i) => <option key={i} value={cal.sem1Weeks + i + 1}>{weekLabel(cal, cal.sem1Weeks + i + 1)}{cal.sem1Weeks + i + 1 === nowWeek ? " · hiện tại" : ""}</option>)}</optgroup>
        </Select>
        <button type="button" aria-label="Tuần sau" disabled={week >= cal.totalWeeks} onClick={() => go(year, week + 1)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-border bg-white/85 hover:bg-slate-50 disabled:opacity-40"><ChevronRight className="size-4" /></button>
      </div>
    </div>
  );
}
