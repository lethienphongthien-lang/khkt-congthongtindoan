import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { emulationRanking } from "@/lib/services/emulation";
import { currentValue, resolvePeriod, PERIOD_LABEL, type PeriodType } from "@/lib/emulation-period";
import { loadCalendars } from "@/lib/services/school-calendar";
import { schoolYearOf } from "@/lib/school-calendar";
import { formatDate, formatDateShort, pageParam, str } from "@/utils";
import { DataTable, EmptyState, PageHeader, Pagination, Section, Td, Th } from "@/components/ui/misc";
import { RankingList } from "@/components/emulation/ranking-list";
import { RankGroups } from "@/components/emulation/rank-groups";
import { PeriodFilter } from "@/components/emulation/period-filter";
import { AddRecordButton, DeleteRecordButton } from "@/components/emulation/record-actions";

export const metadata = { title: "Thi đua" };
const PAGE_SIZE = 10;

export default async function EmulationPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const rawType = str(sp.type);
  const type: PeriodType = rawType && rawType in PERIOD_LABEL ? (rawType as PeriodType) : "week";
  const calendars = await loadCalendars();
  const period = resolvePeriod(type, str(sp.value) ?? "", calendars) ?? resolvePeriod(type, currentValue(type, new Date(), calendars), calendars)!;
  const page = pageParam(sp.page);
  const admin = user.role === "ADMIN";

  // Admin xem mọi bản ghi; các vai trò khác chỉ thấy bản ghi của Chi đoàn mình.
  const recWhere = { recordedAt: { gte: period.from, lt: period.to }, ...(admin ? {} : { departmentId: user.departmentId ?? "__none__" }) };
  const [ranking, records, recTotal, departments] = await Promise.all([
    emulationRanking(period),
    db.emulationRecord.findMany({ where: recWhere, orderBy: { recordedAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, include: { department: { select: { name: true } }, createdBy: { select: { fullName: true } } } }),
    db.emulationRecord.count({ where: recWhere }),
    admin ? db.department.findMany({ where: { graduatedAt: null, isTeacher: false }, orderBy: { name: "asc" }, select: { id: true, name: true } }) : Promise.resolve([]),
  ]);

  return (
    <>
      <PageHeader title="Thi đua Chi đoàn" description={period.label}
        actions={admin && <AddRecordButton departments={departments} calendars={calendars} defaultYear={schoolYearOf()} defaultWeek={Number(currentValue("week", new Date(), calendars).split("-T")[1])} />} />
      <PeriodFilter type={period.type} value={period.value} calendars={calendars} />

      {ranking.length === 0 ? (
        <div className="rounded-lg border border-border bg-white/85"><EmptyState title="Chưa có Chi đoàn nào" /></div>
      ) : (
        <>
        <RankingList items={ranking.map((r) => ({ ...r, mine: user.departmentId === r.id, canOpen: user.role === "ADMIN" }))} />
        <div className="max-sm:hidden"><RankGroups rows={ranking} mineId={user.departmentId} linkBase={user.role === "ADMIN" ? "/departments" : undefined} /></div>
        </>
      )}
      <p className="mt-2 text-xs text-muted">Xếp hạng theo Điểm thi đua do Admin và Ban chấp hành Đoàn trường ghi nhận. Tuần, học kỳ và năm học tính theo lịch năm học của trường (Tuần 1 bắt đầu từ ngày Admin đặt trong Cài đặt → Năm học).</p>

      <Section title={admin ? "Điểm thi đua trường đã ghi nhận" : "Điểm thi đua trường của Chi đoàn bạn"} className="mt-8">
        {records.length === 0 ? <div className="rounded-lg border border-border bg-white/85"><EmptyState title="Chưa có bản ghi trong kỳ này" /></div> : (
          <>
          <ul className="divide-y divide-border rounded-lg border border-border bg-white/85 sm:hidden">
            {records.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-2 text-sm">{r.reason}</div>
                  <div className="truncate text-xs text-muted">{formatDateShort(r.recordedAt)} · {r.department.name}{r.createdBy ? ` · ${r.createdBy.fullName}` : ""}</div>
                </div>
                <span className={`text-base font-semibold tabular-nums ${r.points < 0 ? "text-danger" : "text-primary"}`}>{r.points > 0 ? "+" : ""}{r.points}</span>
                {admin && <DeleteRecordButton id={r.id} />}
              </li>
            ))}
          </ul>
          <div className="max-sm:hidden">
          <DataTable>
            <thead><tr><Th>Ngày</Th><Th>Chi đoàn</Th><Th>Nội dung</Th><Th className="text-right">Điểm</Th><Th>Người ghi</Th>{admin && <Th />}</tr></thead>
            <tbody>{records.map((r) => (
              <tr key={r.id}>
                <Td className="whitespace-nowrap">{formatDate(r.recordedAt)}</Td><Td className="font-medium">{r.department.name}</Td><Td>{r.reason}</Td>
                <Td className={`text-right font-medium tabular-nums ${r.points < 0 ? "text-danger" : "text-primary"}`}>{r.points > 0 ? "+" : ""}{r.points}</Td>
                <Td>{r.createdBy?.fullName ?? "—"}</Td>
                {admin && <Td className="text-right"><DeleteRecordButton id={r.id} /></Td>}
              </tr>
            ))}</tbody>
          </DataTable>
          </div>
          </>
        )}
        <Pagination page={page} pageSize={PAGE_SIZE} total={recTotal} basePath="/emulation" params={{ type: period.type, value: period.value }} />
      </Section>
    </>
  );
}
