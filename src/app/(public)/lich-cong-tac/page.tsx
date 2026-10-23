import { getCurrentUser } from "@/lib/auth/session";
import { currentWeek, defaultCalendar, schoolYearOf, weekLabel, yearLabel } from "@/lib/school-calendar";
import { loadCalendars } from "@/lib/services/school-calendar";
import { getWeekSchedule } from "@/lib/services/schedule";
import { PageTitle } from "@/components/public/blocks";
import { WeekPicker } from "@/components/schedule/week-picker";
import { PrintButton } from "@/components/schedule/print-button";
import { cn } from "@/utils";

export const metadata = { title: "Lịch công tác tuần" };

export default async function PublicSchedulePage({ searchParams }: { searchParams: Promise<{ nh?: string; tuan?: string }> }) {
  const sp = await searchParams;
  const calendars = await loadCalendars();
  const year = Number(sp.nh) || schoolYearOf();
  const cal = calendars.find((c) => c.startYear === year) ?? defaultCalendar(year);
  // Chưa có/ sai tuần: dùng tuần hiện tại luôn (không chuyển hướng, tránh nháy khung chờ hai lần)
  const asked = Number(sp.tuan);
  const week = Number.isInteger(asked) && asked >= 1 && asked <= cal.totalWeeks ? asked : currentWeek(cal) ?? 1;
  const data = (await getWeekSchedule(cal, week))!;
  const admin = (await getCurrentUser())?.role === "ADMIN";
  const visible = data.published || (admin && data.itemCount > 0); // Admin xem được bản nháp để xem trước / in thử
  const today = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);

  return (
    <>
      <PageTitle title="Lịch công tác tuần" description={`${weekLabel(cal, week)} · Năm học ${yearLabel(year)}`} actions={<WeekPicker className="" calendars={calendars.some((c) => c.startYear === year) ? calendars : [...calendars, cal].sort((a, b) => b.startYear - a.startYear)} year={year} week={week} />} />
      {!data.published && admin && data.itemCount > 0 && <p className="no-print mb-3 rounded-sm bg-warning-light px-3 py-2 text-sm text-warning">Bản nháp — chỉ quản trị viên xem được. Công bố ở trang quản lý để hiện công khai.</p>}
      {/* Chưa có / chưa công bố: vẫn hiện đủ 7 ngày trong tuần (ô trống) kèm ghi chú */}
      {!visible && <p className="mb-3 rounded-sm bg-slate-100 px-3 py-2 text-sm text-muted">Chưa có lịch công tác cho tuần này.</p>}
      {(
        <>
          {visible && <div className="no-print mb-3 flex justify-end"><PrintButton /></div>}
          <div className="hidden print:block print:mb-3 print:text-center">
            <p className="text-sm font-semibold uppercase">Đoàn trường THPT Sơn Hà</p>
            <h2 className="text-lg font-bold uppercase">Lịch công tác {weekLabel(cal, week)}</h2>
          </div>
          <div className="overflow-hidden rounded border border-border bg-white/85 print:rounded-none print:border-black">
            <div className="hidden grid-cols-[9rem_6rem_1fr_12rem_11rem] [&>*]:pr-3 border-b border-border bg-primary-light px-4 py-2 text-xs font-semibold text-primary-dark uppercase md:grid print:grid">
              <div>Ngày</div><div>Thời gian</div><div>Nội dung</div><div>Phụ trách</div><div>Địa điểm</div>
            </div>
            {data.days.map((d) => ({ ...d, items: visible ? d.items : [] })).map((d) => (
              <div key={d.date} className={cn("border-b border-border px-4 py-3 last:border-0", d.date === today && "bg-primary-light/50")}>
                <div className="md:grid md:grid-cols-[9rem_1fr] md:gap-x-0 print:grid print:grid-cols-[9rem_1fr]">
                  <div className="mb-1 text-sm font-semibold text-primary-dark md:mb-0">{d.label}{d.date === today && <span className="no-print block text-xs font-normal whitespace-nowrap">(hôm nay)</span>}</div>
                  <div className="space-y-2">
                    {d.items.length === 0 ? <div className="text-sm text-muted">—</div> : d.items.map((it) => (
                      <div key={it.id} className="grid text-sm md:grid-cols-[6rem_1fr_12rem_11rem] print:grid-cols-[6rem_1fr_12rem_11rem] md:print:grid [&>*]:pr-3">
                        <div className="font-medium text-primary">{it.time ?? ""}</div>
                        <div className="font-medium">{it.content}</div>
                        <div className="text-muted md:text-foreground">{it.assignee ? <><span className="md:hidden print:hidden">Phụ trách: </span>{it.assignee}</> : ""}</div>
                        <div className="text-muted md:text-foreground">{it.place ? <><span className="md:hidden print:hidden">Địa điểm: </span>{it.place}</> : ""}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
