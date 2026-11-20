import { getT } from "@/lib/i18n/server";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { ClickRow } from "@/components/ui/click-row";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { formatDateTime, pageParam, str } from "@/utils";
import { CompactList } from "@/components/ui/compact-list";
import { FilterBar } from "@/components/ui/filter-bar";
import { DataTable, EmptyState, PageHeader, Pagination, StatusBadge, Td, Th } from "@/components/ui/misc";
import type { MessageKey } from "@/lib/i18n/translate";
import { FEEDBACK_STATUS } from "@/components/feedback/status";

export async function generateMetadata() { return { title: (await getT())("cms.feedback.title") }; }
const PAGE_SIZE = 12;

export default async function FeedbackListPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const t = await getT();
  await requireRole(["ADMIN"]);
  const sp = await searchParams;
  const status = str(sp.status);
  const page = pageParam(sp.page);
  const where: Prisma.FeedbackWhereInput = {
    ...(status && status in FEEDBACK_STATUS ? { status: status as keyof typeof FEEDBACK_STATUS } : {}),
    AND: [
      { OR: [{ category: null }, { category: { not: "TƯ VẤN TÂM LÝ" } }] },
      { OR: [{ category: null }, { category: { not: { startsWith: "forum:" } } }] },
    ],
  };
  const [items, total, unread] = await Promise.all([
    db.feedback.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    db.feedback.count({ where }),
    db.feedback.count({ where: { status: "NEW" } }),
  ]);
  const badge = (s: keyof typeof FEEDBACK_STATUS) => <StatusBadge tone={FEEDBACK_STATUS[s].tone}>{t(`community.fas.${s}` as MessageKey)}</StatusBadge>;
  return (
    <>
      <PageHeader title={t("cms.feedback.title")} description={t("cms.feedback.desc", { n: unread })} />
      <FilterBar fields={[{ type: "select", name: "status", label: t("cms.feedback.allStatus"), options: Object.entries(FEEDBACK_STATUS).map(([value, v]) => ({ value, label: t(`community.fas.${value}` as MessageKey) })) }]} />
      {items.length === 0 ? <div className="rounded-lg border border-border bg-white/85"><EmptyState title={t("cms.feedback.emptyTitle")} description={t("cms.feedback.emptyDesc")} /></div> : (
        <>
          <CompactList items={items.map((f) => ({ id: f.id, title: f.content, subtitle: `${f.category ?? t("cms.feedback.other")} · ${formatDateTime(f.createdAt)}`, badge: badge(f.status), href: `/feedback/${f.id}` }))} />
          <div className="max-sm:hidden">
            <DataTable>
              <thead><tr><Th>{t("cms.feedback.thContent")}</Th><Th>{t("cms.feedback.thTopic")}</Th><Th>{t("cms.feedback.thTime")}</Th><Th>{t("cms.feedback.thStatus")}</Th></tr></thead>
              <tbody>{items.map((f) => (
                <ClickRow key={f.id} href={`/feedback/${f.id}`}>
                  <Td className="max-w-xl"><Link href={`/feedback/${f.id}`} className={`line-clamp-2 hover:text-primary ${f.status === "NEW" ? "font-semibold" : ""}`}>{f.content}</Link></Td>
                  <Td className="whitespace-nowrap">{f.category ?? t("cms.feedback.other")}</Td>
                  <Td className="whitespace-nowrap">{formatDateTime(f.createdAt)}</Td>
                  <Td>{badge(f.status)}</Td>
                </ClickRow>
              ))}</tbody>
            </DataTable>
          </div>
        </>
      )}
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath="/feedback" params={{ status }} />
    </>
  );
}
