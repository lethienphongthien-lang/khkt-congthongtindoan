import { getT } from "@/lib/i18n/server";
import Link from "next/link";
import { Plus } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { formatDate, formatDateTime, formatHours, pageParam } from "@/utils";
import { buttonClass } from "@/components/ui/button";
import { CompactList } from "@/components/ui/compact-list";
import { DataTable, EmptyState, PageHeader, Pagination, StatusBadge, Td, Th, type Tone } from "@/components/ui/misc";
import { VolunteerApprovedActions, VolunteerRequestActions } from "@/components/volunteer/request-actions";

export async function generateMetadata() { return { title: (await getT())("cms.vol.title") }; }
const PAGE_SIZE = 15;
const STATUS: Record<string, { label: "cms.vol.pending" | "cms.vol.approved" | "cms.vol.completed" | "cms.vol.rejected"; tone: Tone }> = { PENDING: { label: "cms.vol.pending", tone: "amber" }, APPROVED: { label: "cms.vol.approved", tone: "blue" }, COMPLETED: { label: "cms.vol.completed", tone: "green" }, REJECTED: { label: "cms.vol.rejected", tone: "red" } };

/** Các đăng ký tình nguyện: bí thư xem của Chi đoàn mình (chờ duyệt, đã duyệt, bị từ chối); Admin xem của mọi Chi đoàn và duyệt ngay tại đây hoặc ở Hàng chờ duyệt. */
export default async function VolunteerPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const t = await getT();
  const user = await requireRole(["ADMIN", "SECRETARY", "DEPARTMENT_ACCOUNT"]);
  const admin = user.role === "ADMIN";
  const page = pageParam((await searchParams).page);
  const where = admin ? {} : { departmentId: user.departmentId ?? "__none__" };
  const [rows, total] = await Promise.all([
    db.volunteerRequest.findMany({ where, orderBy: [{ createdAt: "desc" }], skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, include: { department: { select: { name: true } } } }),
    db.volunteerRequest.count({ where }),
  ]);
  const detail = (r: (typeof rows)[number]) => r.status === "REJECTED" && r.rejectReason ? t("cms.vol.reason", { reason: r.rejectReason }) : "";
  const action = (r: (typeof rows)[number]) => r.status === "PENDING" ? <VolunteerRequestActions id={r.id} task={r.task} admin={admin} />
    : r.status === "APPROVED" ? <VolunteerApprovedActions id={r.id} task={r.task} points={r.points} /> : null;
  return (
    <>
      <PageHeader title={t("cms.vol.title")} description={admin ? t("cms.vol.descAdmin") : t("cms.vol.descChapter", { name: user.departmentName ?? "" })}
        actions={<Link href="/volunteer/new" className={buttonClass()}><Plus className="size-4" />{t("cms.vol.register")}</Link>} />
      {rows.length === 0 ? (
        <div className="rounded-lg border border-border bg-white/85"><EmptyState title={t("cms.vol.emptyTitle")} description={t("cms.vol.emptyDesc")}
          action={<Link href="/volunteer/new" className={buttonClass()}>{t("cms.vol.registerFirst")}</Link>} /></div>
      ) : (
        <>
          <CompactList items={rows.map((r) => ({ id: r.id, title: r.task, subtitle: `${formatDate(r.startAt)} · ${t("cms.vol.chapterName", { name: r.department.name })}`, badge: <StatusBadge tone={STATUS[r.status].tone}>{t(STATUS[r.status].label)}</StatusBadge>,
            details: [[t("cms.vol.dTime"), formatDateTime(r.startAt)], [t("cms.vol.dPlace"), r.location], [t("cms.vol.dHours"), formatHours(Math.round(r.hours * 60))], [t("cms.vol.dPoints"), r.points], [t("cms.vol.dStatus"), t(STATUS[r.status].label)], ...(detail(r) ? [[t("cms.vol.dNote"), detail(r)] as [string, string]] : [])],
            actions: action(r) ?? undefined }))} />
          <div className="max-sm:hidden">
            <DataTable>
              <thead><tr><Th>{t("cms.vol.thTask")}</Th>{admin && <Th>{t("cms.vol.thChapter")}</Th>}<Th>{t("cms.vol.dTime")}</Th><Th>{t("cms.vol.dPlace")}</Th><Th className="text-right">{t("cms.vol.thHours")}</Th><Th className="text-right">{t("cms.vol.dPoints")}</Th><Th>{t("cms.vol.dStatus")}</Th><Th /></tr></thead>
              <tbody>{rows.map((r) => (
                <tr key={r.id}>
                  <Td className="font-medium">{r.task}{detail(r) && <div className="text-xs font-normal text-danger">{detail(r)}</div>}{r.note && <div className="text-xs font-normal text-muted">{r.note}</div>}</Td>
                  {admin && <Td>{r.department.name}</Td>}
                  <Td className="whitespace-nowrap">{formatDateTime(r.startAt)}</Td><Td>{r.location}</Td>
                  <Td className="text-right tabular-nums">{r.hours}</Td><Td className="text-right tabular-nums">{r.points}</Td>
                  <Td><StatusBadge tone={STATUS[r.status].tone}>{t(STATUS[r.status].label)}</StatusBadge></Td>
                  <Td className="text-right">{action(r)}</Td>
                </tr>
              ))}</tbody>
            </DataTable>
          </div>
        </>
      )}
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath="/volunteer" params={{}} />
    </>
  );
}
