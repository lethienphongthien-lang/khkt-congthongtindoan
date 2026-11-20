import { getT } from "@/lib/i18n/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { departmentScope } from "@/lib/permissions";
import { currentValue, resolvePeriod } from "@/lib/emulation-period";
import { loadCalendars } from "@/lib/services/school-calendar";
import { formatDateTime, str } from "@/utils";
import { DataTable, EmptyState, PageHeader, Section, Td, Th } from "@/components/ui/misc";
import { ViolationButton, DeleteViolationButton } from "@/components/members/violation-actions";
import { violationTypeLabel } from "@/lib/violation-types";
import { WeekFilter } from "@/components/emulation/period-filter";

export async function generateMetadata() { const t = await getT(); return { title: t("vio.title") }; }

export default async function ViolationsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireRole(["ADMIN", "MONITOR", "DEPARTMENT_ACCOUNT", "SECRETARY"]);
  const t = await getT();
  const sp = await searchParams;
  const calendars = await loadCalendars();
  const period = resolvePeriod("week", str(sp.value) ?? "", calendars) ?? resolvePeriod("week", currentValue("week", new Date(), calendars), calendars)!;
  const scope = departmentScope(user); // undefined cho Admin (toàn trường), departmentId cho cờ đỏ/tài khoản Chi đoàn

  const canCreate = user.role === "MONITOR" || user.role === "ADMIN";
  const showDeptColumn = scope === undefined; // Admin/cờ đỏ xem toàn trường -> cần biết vi phạm thuộc Chi đoàn nào
  const [violations, departments] = await Promise.all([
    db.violation.findMany({
      where: { recordedAt: { gte: period.from, lt: period.to }, ...(scope ? { departmentId: scope } : {}) },
      orderBy: { recordedAt: "desc" },
      include: { member: { select: { id: true, fullName: true, code: true } }, department: { select: { name: true } }, recordedBy: { select: { fullName: true } } },
      take: 300,
    }),
    canCreate ? db.department.findMany({ where: { graduatedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } }) : Promise.resolve([]),
  ]);

  return (
    <>
      <PageHeader title={user.role === "ADMIN" ? t("vio.weekAll") : user.role === "MONITOR" ? t("vio.monitor") : t("vio.chapter")} description={period.label}
        actions={canCreate ? <ViolationButton departments={departments} /> : undefined} />
      <WeekFilter value={period.value} calendars={calendars} />
      <Section title={t("vio.count", { n: violations.length })}>
        {violations.length === 0 ? <EmptyState title={t("vio.none")} /> : (
          <DataTable>
            <thead><tr>{showDeptColumn && <Th>{t("members.f.dept")}</Th>}<Th>{t("vio.member")}</Th><Th>{t("members.f.kind")}</Th><Th>{t("vio.content")}</Th><Th>{t("vio.time")}</Th><Th>{t("vio.recordedBy")}</Th><Th /></tr></thead>
            <tbody>
              {violations.map((v) => {
                const canDelete = user.role === "ADMIN" || (user.role === "MONITOR" && v.recordedById === user.id);
                return (
                <tr key={v.id}>
                  {showDeptColumn && <Td className="whitespace-nowrap">{v.department.name}</Td>}
                  <Td className="whitespace-nowrap">{v.member.fullName} <span className="text-xs text-muted">({v.member.code})</span></Td>
                  <Td className="whitespace-nowrap">{violationTypeLabel(t, v.type)}</Td>
                  <Td>{v.content}</Td>
                  <Td className="whitespace-nowrap">{formatDateTime(v.recordedAt)}</Td>
                  <Td className="whitespace-nowrap">{v.recordedBy.fullName}</Td>
                  <Td>{canDelete && <DeleteViolationButton id={v.id} />}</Td>
                </tr>
                );
              })}
            </tbody>
          </DataTable>
        )}
      </Section>
    </>
  );
}
