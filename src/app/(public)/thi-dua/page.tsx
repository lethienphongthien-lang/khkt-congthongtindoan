import { currentValue, resolvePeriod, PERIOD_LABEL, type PeriodType } from "@/lib/emulation-period";
import { loadCalendars } from "@/lib/services/school-calendar";
import { cachedRanking } from "@/lib/services/emulation";
import { str } from "@/utils";
import { PageTitle } from "@/components/public/blocks";
import { PeriodFilter } from "@/components/emulation/period-filter";
import { RankingList } from "@/components/emulation/ranking-list";
import { RankGroups } from "@/components/emulation/rank-groups";
import { EmptyState } from "@/components/ui/misc";

export const metadata = { title: "Bảng thi đua" };

export default async function PublicEmulationPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const raw = str(sp.type);
  const type: PeriodType = raw && raw in PERIOD_LABEL ? (raw as PeriodType) : "week";
  const calendars = await loadCalendars();
  const period = resolvePeriod(type, str(sp.value) ?? "", calendars) ?? resolvePeriod(type, currentValue(type, new Date(), calendars), calendars)!;
  const ranking = await cachedRanking(period.type, period.value);
  return (
    <>
      <PageTitle title="Bảng thi đua Chi đoàn" description={period.label} />
      <PeriodFilter type={period.type} value={period.value} calendars={calendars} />
      {ranking.length === 0 ? <div className="rounded border border-border bg-white/85"><EmptyState title="Chưa có dữ liệu thi đua" /></div> : (
        <>
          <RankingList items={ranking.map((r) => ({ ...r, mine: false, canOpen: false }))} />
          <div className="max-sm:hidden"><RankGroups rows={ranking} /></div>
        </>
      )}
      <p className="mt-2 text-xs text-muted">Bảng trên xếp hạng theo Điểm thi đua do Đoàn trường ghi nhận theo tuần.</p>
    </>
  );
}
