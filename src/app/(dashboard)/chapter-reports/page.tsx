import Link from "next/link";
import { ClickRow } from "@/components/ui/click-row";
import { Plus } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { formatDate, pageParam } from "@/utils";
import { buttonClass } from "@/components/ui/button";
import { CompactList } from "@/components/ui/compact-list";
import { DataTable, EmptyState, PageHeader, Pagination, Td, Th } from "@/components/ui/misc";
import { ReportRowActions } from "@/components/cms/row-actions";

export const metadata = { title: "Báo cáo Chi đoàn" };
const PAGE_SIZE = 12;

export default async function ChapterReportsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const user = await requireRole(["ADMIN", "SECRETARY"]);
  const page = pageParam((await searchParams).page);
  const where = user.role === "ADMIN" ? {} : { departmentId: user.departmentId ?? "__none__" };
  const [items, total] = await Promise.all([
    db.chapterReport.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, include: { department: { select: { name: true } } } }),
    db.chapterReport.count({ where }),
  ]);
  return (
    <>
      <PageHeader title="Báo cáo Chi đoàn" description={user.role === "SECRETARY" ? `Báo cáo của Chi đoàn ${user.departmentName} (hiển thị công khai)` : "Báo cáo của các Chi đoàn"}
        actions={<Link href="/chapter-reports/new" className={buttonClass()}><Plus className="size-4" />Đăng báo cáo</Link>} />
      {items.length === 0 ? <div className="rounded-lg border border-border bg-white/85"><EmptyState title="Chưa có báo cáo" description="Đăng báo cáo để hiển thị tại mục Báo cáo Chi đoàn trên trang công khai." action={<Link href="/chapter-reports/new" className={buttonClass()}>Đăng báo cáo đầu tiên</Link>} /></div> : (
        <>
          <CompactList items={items.map((r) => ({
            id: r.id, title: r.title, subtitle: `Chi đoàn ${r.department.name} · ${formatDate(r.createdAt)}`, href: `/chapter-reports/${r.id}`,
          }))} />
          <div className="max-sm:hidden">
            <DataTable>
              <thead><tr><Th>Tiêu đề</Th><Th>Chi đoàn</Th><Th>Ngày đăng</Th><Th /></tr></thead>
              <tbody>{items.map((r) => (
                <ClickRow key={r.id} href={`/chapter-reports/${r.id}`}>
                  <Td className="font-medium"><Link href={`/chapter-reports/${r.id}`} className="hover:text-primary">{r.title}</Link></Td>
                  <Td>{r.department.name}</Td><Td className="whitespace-nowrap">{formatDate(r.createdAt)}</Td>
                  <Td className="text-right"><ReportRowActions id={r.id} /></Td>
                </ClickRow>
              ))}</tbody>
            </DataTable>
          </div>
        </>
      )}
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath="/chapter-reports" params={{}} />
    </>
  );
}
