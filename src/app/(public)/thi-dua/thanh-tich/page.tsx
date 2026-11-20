import { Trophy } from "lucide-react";
import { cachedRanking } from "@/lib/services/emulation";
import { monthValue, resolvePeriod } from "@/lib/emulation-period";
import { PageTitle } from "@/components/public/blocks";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata() {
  return { title: (await getT())("community.emu.achTitle") };
}
export const revalidate = 300;

export default async function AchievementsPublicPage() {
  const t = await getT();
  const now = new Date();
  const values = Array.from({ length: 6 }, (_, i) => monthValue(new Date(now.getFullYear(), now.getMonth() - i, 15)));
  const results = await Promise.all(values.map(async (v) => ({ period: resolvePeriod("month", v)!, ranking: await cachedRanking("month", v) })));
  return (
    <>
      <PageTitle title={t("community.emu.achTitle")} description={t("community.emu.achDesc")} />
      <div className="grid gap-4 md:grid-cols-2">
        {results.map(({ period, ranking }) => (
          <section key={period.value} className="rounded border border-border bg-white/85">
            <h2 className="border-b border-border px-4 py-2.5 text-[15px] font-bold text-primary-dark">{period.label}</h2>
            {ranking.filter((r) => r.total !== 0).length === 0 ? <p className="p-4 text-sm text-muted">{t("community.emu.noData")}</p> : (
              <ol className="divide-y divide-border">
                {ranking.slice(0, 3).map((r) => (
                  <li key={r.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                    <span className={`flex size-7 items-center justify-center rounded-full text-[13px] font-bold ${r.rank === 1 ? "bg-primary text-white" : "bg-slate-100 text-slate-600"}`}>{r.rank === 1 ? <Trophy className="size-4" /> : r.rank}</span>
                    <span className="flex-1 font-medium">{t("community.emu.chapterName", { name: r.name })}</span>
                    <span className="font-semibold tabular-nums">{r.total}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        ))}
      </div>
    </>
  );
}
