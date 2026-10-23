"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Select } from "@/components/ui/form";
import { PERIOD_LABEL, currentValue, type PeriodType } from "@/lib/emulation-period";
import { currentWeek, schoolYearOf, weekLabel, yearLabel, type SchoolCalendar } from "@/lib/school-calendar";

const pad = (n: number) => String(n).padStart(2, "0");
const cell = "w-full sm:w-auto sm:min-w-40";

/** Chọn kỳ thi đua theo lịch năm học: Tuần → chọn năm học rồi tuần (kèm ngày tháng); Học kỳ / Năm học → chọn năm học; Tháng → lịch dương. */
export function PeriodFilter({ type, value, calendars }: { type: PeriodType; value: string; calendars: SchoolCalendar[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [, start] = useTransition();
  const cur = schoolYearOf();
  const nowYear = new Date().getFullYear();
  const calYears = Array.from({ length: 6 }, (_, i) => nowYear + 1 - i);
  const calOf = (y: number) => calendars.find((c) => c.startYear === y);
  const yearOptions = (selected: number) => [...new Set([...calendars.map((c) => c.startYear), selected])].sort((a, b) => b - a)
    .map((y) => <option key={y} value={y}>Năm học {yearLabel(y)}{y === cur ? " (hiện tại)" : ""}</option>);

  const go = (t: PeriodType, v: string) => {
    const next = new URLSearchParams(sp.toString());
    next.set("type", t); next.set("value", v); next.delete("page");
    start(() => router.replace(`${pathname}?${next}`));
  };

  let controls: React.ReactNode;
  if (type === "month") {
    const [y, m] = value.split("-").map(Number);
    controls = (
      <>
        <Select aria-label="Tháng" value={m} onChange={(e) => go("month", `${y}-${pad(+e.target.value)}`)} className={cell}>
          {Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>Tháng {i + 1}</option>)}
        </Select>
        <Select aria-label="Năm" value={y} onChange={(e) => go("month", `${e.target.value}-${pad(m)}`)} className={cell}>
          {[...new Set([...calYears, y])].map((v) => <option key={v} value={v}>{v}</option>)}
        </Select>
      </>
    );
  } else if (type === "week") {
    const m = value.match(/^(\d{4})-T(\d+)$/);
    const y = m ? Number(m[1]) : cur;
    const w = m ? Number(m[2]) : 1;
    const c = calOf(y);
    const goWeek = (yy: number, ww: number) => go("week", `${yy}-T${pad(ww)}`);
    const nowWeek = c ? currentWeek(c) : null;
    controls = (
      <>
        <Select aria-label="Năm học" value={y} onChange={(e) => goWeek(+e.target.value, Math.min(w, calOf(+e.target.value)?.totalWeeks ?? 35))} className={cell}>{yearOptions(y)}</Select>
        <Select aria-label="Tuần" value={w} onChange={(e) => goWeek(y, +e.target.value)} className={`${cell} sm:min-w-56`}>
          {c ? (
            <>
              <optgroup label="Học kỳ 1">{Array.from({ length: c.sem1Weeks }, (_, i) => <option key={i} value={i + 1}>{weekLabel(c, i + 1)}{i + 1 === nowWeek ? " · hiện tại" : ""}</option>)}</optgroup>
              <optgroup label="Học kỳ 2">{Array.from({ length: c.totalWeeks - c.sem1Weeks }, (_, i) => <option key={i} value={c.sem1Weeks + i + 1}>{weekLabel(c, c.sem1Weeks + i + 1)}{c.sem1Weeks + i + 1 === nowWeek ? " · hiện tại" : ""}</option>)}</optgroup>
            </>
          ) : <option value={w}>Tuần {w}</option>}
        </Select>
      </>
    );
  } else if (type === "semester") {
    const [y, t] = value.split("-").map(Number);
    controls = (
      <>
        <Select aria-label="Năm học" value={y} onChange={(e) => go("semester", `${e.target.value}-${t}`)} className={cell}>{yearOptions(y)}</Select>
        <Select aria-label="Học kỳ" value={t} onChange={(e) => go("semester", `${y}-${e.target.value}`)} className={cell}>
          <option value={1}>Học kỳ 1</option><option value={2}>Học kỳ 2</option>
        </Select>
      </>
    );
  } else {
    const y = Number(value);
    controls = (
      <Select aria-label="Năm học" value={y} onChange={(e) => go("year", e.target.value)} className={`${cell} col-span-2 sm:col-span-1`}>{yearOptions(y)}</Select>
    );
  }

  return (
    <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="grid grid-cols-4 overflow-hidden rounded-md border border-border bg-white/85 sm:inline-flex" role="tablist">
        {(Object.keys(PERIOD_LABEL) as PeriodType[]).map((t) => (
          <button key={t} role="tab" aria-selected={t === type} onClick={() => go(t, currentValue(t, new Date(), calendars))}
            className={`px-2 py-2 text-[13px] sm:px-3.5 sm:py-1.5 sm:text-sm ${t === type ? "bg-primary font-medium text-white" : "hover:bg-slate-50"}`}>{PERIOD_LABEL[t]}</button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:flex">{controls}</div>
    </div>
  );
}
