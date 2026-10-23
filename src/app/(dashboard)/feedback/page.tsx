import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { ClickRow } from "@/components/ui/click-row";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { formatDateTime, pageParam, str } from "@/utils";
import { CompactList } from "@/components/ui/compact-list";
import { FilterBar } from "@/components/ui/filter-bar";
import { DataTable, EmptyState, PageHeader, Pagination, StatusBadge, Td, Th } from "@/components/ui/misc";
import { FEEDBACK_STATUS } from "@/components/feedback/status";

export const metadata = { title: "Góp ý" };
const PAGE_SIZE = 12;

export default async function FeedbackListPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireRole(["ADMIN"]);
  const sp = await searchParams;
  const status = str(sp.status);
  const page = pageParam(sp.page);
  const where: Prisma.FeedbackWhereInput = status && status in FEEDBACK_STATUS ? { status: status as keyof typeof FEEDBACK_STATUS } : {};
  const [items, total, unread] = await Promise.all([
    db.feedback.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    db.feedback.count({ where }),
    db.feedback.count({ where: { status: "NEW" } }),
  ]);
  const badge = (s: keyof typeof FEEDBACK_STATUS) => <StatusBadge tone={FEEDBACK_STATUS[s].tone}>{FEEDBACK_STATUS[s].label}</StatusBadge>;
  return (
    <>
      <PageHeader title="Góp ý" description={`${unread} góp ý mới · gửi ẩn danh từ trang công khai`} />
      <FilterBar fields={[{ type: "select", name: "status", label: "Tất cả trạng thái", options: Object.entries(FEEDBACK_STATUS).map(([value, v]) => ({ value, label: v.label })) }]} />
      {items.length === 0 ? <div className="rounded-lg border border-border bg-white/85"><EmptyState title="Chưa có góp ý" description="Góp ý gửi từ trang công khai sẽ hiện ở đây." /></div> : (
        <>
          <CompactList items={items.map((f) => ({ id: f.id, title: f.content, subtitle: `${f.category ?? "Khác"} · ${formatDateTime(f.createdAt)}`, badge: badge(f.status), href: `/feedback/${f.id}` }))} />
          <div className="max-sm:hidden">
            <DataTable>
              <thead><tr><Th>Nội dung</Th><Th>Chủ đề</Th><Th>Thời gian</Th><Th>Trạng thái</Th></tr></thead>
              <tbody>{items.map((f) => (
                <ClickRow key={f.id} href={`/feedback/${f.id}`}>
                  <Td className="max-w-xl"><Link href={`/feedback/${f.id}`} className={`line-clamp-2 hover:text-primary ${f.status === "NEW" ? "font-semibold" : ""}`}>{f.content}</Link></Td>
                  <Td className="whitespace-nowrap">{f.category ?? "Khác"}</Td>
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
