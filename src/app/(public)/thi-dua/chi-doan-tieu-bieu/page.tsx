import { Trophy } from "lucide-react";
import { cachedRanking } from "@/lib/services/emulation";
import { currentValue, resolvePeriod } from "@/lib/emulation-period";
import { loadCalendars } from "@/lib/services/school-calendar";
import { PageTitle } from "@/components/public/blocks";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata() {
  return { title: (await getT())("menu.chi-doan-tieu-bieu") };
}
export const revalidate = 300;

export default async function ExemplaryPage() {
  const t = await getT();
  const cals = await loadCalendars();
  const periods = [resolvePeriod("semester", currentValue("semester", new Date(), cals), cals)!, resolvePeriod("year", currentValue("year", new Date(), cals), cals)!];
  const results = await Promise.all(periods.map(async (p) => ({ period: p, ranking: await cachedRanking(p.type, p.value) })));
  return (
    <>
      <PageTitle title={t("menu.chi-doan-tieu-bieu")} description={t("community.emu.topDesc")} />
      <div className="space-y-6">
        {results.map(({ period, ranking }) => {
          const top = ranking.filter((r) => r.total > 0).slice(0, 3);
          return (
            <section key={period.value}>
              <h2 className="mb-3 border-l-4 border-primary pl-3 text-lg font-bold text-primary-dark">{period.label}</h2>
              {top.length === 0 ? <p className="text-sm text-muted">{t("community.emu.noData")}</p> : (
                <div className="grid gap-3 md:grid-cols-3">
                  {top.map((r, i) => (
                    <div key={r.id} className={`rounded border p-5 text-center ${i === 0 ? "border-primary bg-primary-light" : "border-border bg-white/85"}`}>
                      <div className={`mx-auto mb-2 flex size-12 items-center justify-center rounded-full ${i === 0 ? "bg-primary text-white" : "bg-slate-100 text-slate-600"}`}>{i === 0 ? <Trophy className="size-6" /> : <span className="text-lg font-bold">{r.rank}</span>}</div>
                      <div className="text-xl font-bold">{t("community.emu.chapterName", { name: r.name })}</div>
                      <div className="mt-1 text-2xl font-bold text-primary-dark tabular-nums">{r.total} <span className="text-sm font-normal text-muted">{t("community.emu.points")}</span></div>
                      <div className="mt-1 text-xs text-muted">{t("community.emu.membersCount", { n: r.members })}</div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
