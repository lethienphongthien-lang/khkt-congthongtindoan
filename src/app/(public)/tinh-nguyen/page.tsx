import Link from "next/link";
import { CalendarCheck, Clock, MapPin, Star } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { volunteerSchedule } from "@/lib/services/public";
import { formatHours } from "@/utils";
import { EmptyPublic, PageTitle } from "@/components/public/blocks";
import { buttonClass } from "@/components/ui/button";
import { getT, getLocale } from "@/lib/i18n/server";
import { intlLocale } from "@/lib/i18n/format";

export async function generateMetadata() {
  return { title: (await getT())("menu.g-tinh-nguyen") };
}
const TZ = "Asia/Ho_Chi_Minh";
const dayKey = (d: Date) => new Intl.DateTimeFormat("sv-SE", { timeZone: TZ }).format(d);
const dayLabel = (d: Date, loc: string) => new Intl.DateTimeFormat(loc, { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric", timeZone: TZ }).format(d);
const hm = (d: Date, loc: string) => new Intl.DateTimeFormat(loc, { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TZ }).format(d);

/** Lịch tình nguyện do các Chi đoàn tự đăng ký (bí thư đăng ký cho cả Chi đoàn, ví dụ "quét sân"). Người xem thấy ngày nào lớp nào làm việc gì; bí thư có nút đăng ký. */
export default async function VolunteerPage() {
  const t = await getT();
  const loc = intlLocale(await getLocale());
  const [user, items] = await Promise.all([getCurrentUser(), volunteerSchedule()]);
  const canRegister = user?.role === "SECRETARY" || user?.role === "DEPARTMENT_ACCOUNT" || user?.role === "ADMIN";
  const today = dayKey(new Date());
  const groups = new Map<string, typeof items>();
  for (const a of items) { const k = dayKey(a.startAt); groups.set(k, [...(groups.get(k) ?? []), a]); }
  const days = [...groups.entries()];
  const upcoming = days.filter(([k]) => k >= today), past = days.filter(([k]) => k < today).reverse();

  const Day = ({ k, list }: { k: string; list: typeof items }) => (
    <section className="rounded border border-border bg-white/90">
      <h2 className={`flex items-center gap-2 border-b border-border px-4 py-2 text-[15px] font-semibold ${k === today ? "bg-primary-light text-primary-dark" : "text-slate-700"}`}>
        <CalendarCheck className="size-4 text-primary" />{dayLabel(list[0].startAt, loc)}{k === today && <span className="rounded bg-primary px-1.5 py-0.5 text-[11px] font-medium text-white">{t("community.vol.today")}</span>}
      </h2>
      <ul className="divide-y divide-border">
        {list.map((a) => (
          <li key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 text-sm">
            <span className="min-w-20 rounded bg-primary-light px-2 py-0.5 text-center font-semibold text-primary-dark">{a.department?.isTeacher ? "" : t("community.vol.classPrefix")}{a.department?.name}</span>
            <span className="font-medium">{a.task}</span>
            <span className="flex items-center gap-1 text-slate-600"><Clock className="size-3.5 text-primary" />{hm(a.startAt, loc)}–{hm(a.endAt, loc)}</span>
            <span className="flex items-center gap-1 text-slate-600"><MapPin className="size-3.5 text-primary" />{a.location}</span>
            {a.hours > 0 && <span className="flex items-center gap-1 text-slate-600"><Star className="size-3.5 text-amber-500" />{formatHours(Math.round(a.hours * 60))}{a.points ? ` · ${t("community.vol.pointsEach", { n: a.points })}` : ""}</span>}
            {a.status === "COMPLETED" && <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-xs font-medium text-emerald-700">{t("community.vol.completed")}</span>}
          </li>
        ))}
      </ul>
    </section>
  );

  return (
    <>
      <PageTitle title={t("menu.g-tinh-nguyen")} description={t("community.vol.desc")}
        actions={canRegister ? <Link href="/volunteer/new" className={buttonClass()}>{user?.role === "SECRETARY" || user?.role === "DEPARTMENT_ACCOUNT" ? t("community.vol.registerChapter") : t("community.vol.register")}</Link> : undefined} />
      {!user && <p className="mb-4 rounded bg-primary-light px-3 py-2 text-sm text-primary-dark">{t("community.vol.loginPrompt1")} <Link href="/login?next=/tinh-nguyen" className="font-semibold underline">{t("common.login")}</Link> {t("community.vol.loginPrompt2")}</p>}
      {days.length === 0 ? <div className="rounded border border-border bg-white/85"><EmptyPublic text={t("community.vol.empty")} /></div> : (
        <div className="space-y-5">
          {upcoming.length > 0 && <div className="space-y-3"><h2 className="border-l-4 border-primary pl-3 text-lg font-bold text-primary-dark">{t("community.vol.upcoming")}</h2>{upcoming.map(([k, l]) => <Day key={k} k={k} list={l} />)}</div>}
          {past.length > 0 && <div className="space-y-3"><h2 className="border-l-4 border-slate-300 pl-3 text-lg font-bold text-slate-600">{t("community.vol.past")}</h2>{past.map(([k, l]) => <Day key={k} k={k} list={l} />)}</div>}
        </div>
      )}
    </>
  );
}
