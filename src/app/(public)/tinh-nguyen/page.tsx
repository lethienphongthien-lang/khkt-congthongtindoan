import Link from "next/link";
import { CalendarCheck, Clock, MapPin, Star } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { volunteerSchedule } from "@/lib/services/public";
import { formatHours } from "@/utils";
import { EmptyPublic, PageTitle } from "@/components/public/blocks";
import { buttonClass } from "@/components/ui/button";

export const metadata = { title: "Ngày tình nguyện tại chỗ" };
const TZ = "Asia/Ho_Chi_Minh";
const dayKey = (d: Date) => new Intl.DateTimeFormat("sv-SE", { timeZone: TZ }).format(d);
const dayLabel = (d: Date) => new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric", timeZone: TZ }).format(d);
const hm = (d: Date) => new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TZ }).format(d);

/** Lịch tình nguyện do các Chi đoàn tự đăng ký (bí thư đăng ký cho cả Chi đoàn, ví dụ "quét sân"). Người xem thấy ngày nào lớp nào làm việc gì; bí thư có nút đăng ký. */
export default async function VolunteerPage() {
  const [user, items] = await Promise.all([getCurrentUser(), volunteerSchedule()]);
  const canRegister = user?.role === "SECRETARY" || user?.role === "ADMIN";
  const today = dayKey(new Date());
  const groups = new Map<string, typeof items>();
  for (const a of items) { const k = dayKey(a.startAt); groups.set(k, [...(groups.get(k) ?? []), a]); }
  const days = [...groups.entries()];
  const upcoming = days.filter(([k]) => k >= today), past = days.filter(([k]) => k < today).reverse();

  const Day = ({ k, list }: { k: string; list: typeof items }) => (
    <section className="rounded border border-border bg-white/90">
      <h2 className={`flex items-center gap-2 border-b border-border px-4 py-2 text-[15px] font-semibold ${k === today ? "bg-primary-light text-primary-dark" : "text-slate-700"}`}>
        <CalendarCheck className="size-4 text-primary" />{dayLabel(list[0].startAt)}{k === today && <span className="rounded bg-primary px-1.5 py-0.5 text-[11px] font-medium text-white">Hôm nay</span>}
      </h2>
      <ul className="divide-y divide-border">
        {list.map((a) => (
          <li key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 text-sm">
            <span className="min-w-20 rounded bg-primary-light px-2 py-0.5 text-center font-semibold text-primary-dark">{a.department?.isTeacher ? "" : "Lớp "}{a.department?.name}</span>
            <span className="font-medium">{a.task}</span>
            <span className="flex items-center gap-1 text-slate-600"><Clock className="size-3.5 text-primary" />{hm(a.startAt)}–{hm(a.endAt)}</span>
            <span className="flex items-center gap-1 text-slate-600"><MapPin className="size-3.5 text-primary" />{a.location}</span>
            {a.hours > 0 && <span className="flex items-center gap-1 text-slate-600"><Star className="size-3.5 text-amber-500" />{formatHours(Math.round(a.hours * 60))}{a.points ? ` · +${a.points} điểm mỗi em` : ""}</span>}
            {a.status === "COMPLETED" && <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-xs font-medium text-emerald-700">Đã hoàn thành</span>}
          </li>
        ))}
      </ul>
    </section>
  );

  return (
    <>
      <PageTitle title="Ngày tình nguyện tại chỗ" description="Các lớp tự đăng ký tình nguyện (quét sân, vệ sinh khu vực…). Khi bí thư xác nhận hoàn thành, điểm được tự động cộng cho cả lớp."
        actions={canRegister ? <Link href="/volunteer/new" className={buttonClass()}>{user?.role === "SECRETARY" ? "Đăng ký cho Chi đoàn" : "Đăng ký tình nguyện"}</Link> : undefined} />
      {!user && <p className="mb-4 rounded bg-primary-light px-3 py-2 text-sm text-primary-dark">Bí thư Chi đoàn <Link href="/login?next=/tinh-nguyen" className="font-semibold underline">đăng nhập</Link> để đăng ký tình nguyện cho cả lớp.</p>}
      {days.length === 0 ? <div className="rounded border border-border bg-white/85"><EmptyPublic text="Chưa có lớp nào đăng ký tình nguyện. Bí thư Chi đoàn có thể đăng ký ngay sau khi đăng nhập." /></div> : (
        <div className="space-y-5">
          {upcoming.length > 0 && <div className="space-y-3"><h2 className="border-l-4 border-primary pl-3 text-lg font-bold text-primary-dark">Sắp tới</h2>{upcoming.map(([k, l]) => <Day key={k} k={k} list={l} />)}</div>}
          {past.length > 0 && <div className="space-y-3"><h2 className="border-l-4 border-slate-300 pl-3 text-lg font-bold text-slate-600">Đã diễn ra (14 ngày qua)</h2>{past.map(([k, l]) => <Day key={k} k={k} list={l} />)}</div>}
        </div>
      )}
    </>
  );
}
