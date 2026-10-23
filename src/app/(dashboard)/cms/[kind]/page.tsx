import Link from "next/link";
import { ClickRow } from "@/components/ui/click-row";
import { notFound } from "next/navigation";
import { ExternalLink, Eye, FolderCog, Plus } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { ADMIN_ONLY_KINDS } from "@/lib/services/kind";
import { CMS_SLUG, KIND_ACTION, KIND_LABEL } from "@/lib/services/public";
import { formatDate, pageParam, str } from "@/utils";
import { buttonClass } from "@/components/ui/button";
import { CompactList } from "@/components/ui/compact-list";
import { FilterBar } from "@/components/ui/filter-bar";
import { DataTable, EmptyState, PageHeader, Pagination, StatusBadge, Td, Th } from "@/components/ui/misc";
import { ArticleStatus } from "@/components/cms/row-actions";

const PAGE_SIZE = 12;

export default async function CmsKindPage({ params, searchParams }: { params: Promise<{ kind: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireRole(["ADMIN", "SECRETARY"]);
  const isAdmin = user.role === "ADMIN";
  const { kind: slug } = await params;
  const kind = CMS_SLUG[slug];
  if (!kind || (!isAdmin && ADMIN_ONLY_KINDS.includes(kind))) notFound();
  const sp = await searchParams;
  const q = str(sp.q);
  const page = pageParam(sp.page);
  const base = `/cms/${slug}`;
  const dm = str(sp.dm);
  const isPlan = kind === "PLAN";
  const where: Prisma.ArticleWhereInput = { kind, ...(dm ? { categoryId: dm === "none" ? null : dm } : {}), ...(isAdmin ? {} : { authorId: user.id }), ...(q ? { title: { contains: q, mode: "insensitive" } } : {}) };
  const [items, total, cats] = await Promise.all([
    db.article.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, include: { author: { select: { fullName: true, role: true } }, category: { select: { name: true } } } }),
    db.article.count({ where }),
    isPlan ? db.articleCategory.findMany({ where: { kind: "PLAN" }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], include: { _count: { select: { articles: true } } } }) : Promise.resolve([]),
  ]);
  return (
    <>
      <PageHeader title={KIND_LABEL[kind]} description={isAdmin ? "Quản lý nội dung hiển thị trên trang công khai" : "Bài của bạn được lưu ở dạng nháp, Admin duyệt rồi mới hiển thị công khai"}
        actions={<>
          {isAdmin && isPlan && <Link href="/settings?tab=plancats" className={buttonClass("secondary")}><FolderCog className="size-4" /><span className="max-sm:hidden">Thiết lập danh mục</span></Link>}
          {isAdmin && <Link href={`/${slug}`} target="_blank" className={buttonClass("secondary")}><ExternalLink className="size-4" /><span className="max-sm:hidden">Xem trang công khai</span></Link>}
          <Link href={`${base}/new`} className={buttonClass()}><Plus className="size-4" />{KIND_ACTION[kind]}</Link>
        </>} />
      <FilterBar fields={[{ type: "search", name: "q", placeholder: "Tìm theo tiêu đề..." }, ...(isPlan ? [{ type: "select" as const, name: "dm", label: "Danh mục", options: [...cats.map((c) => ({ value: c.id, label: c.name })), { value: "none", label: "Chưa phân loại" }] }] : [])]} />
      {items.length === 0 ? <div className="rounded-lg border border-border bg-white/85"><EmptyState title={`Chưa có ${KIND_LABEL[kind].toLowerCase()}`} description="Nội dung đăng ở đây sẽ hiển thị trên trang công khai." action={<Link href={`${base}/new`} className={buttonClass()}>{KIND_ACTION[kind]} đầu tiên</Link>} /></div> : (
        <>
          <CompactList items={items.map((a) => ({
            id: a.id, title: a.title, subtitle: `${isAdmin && a.author?.role === "SECRETARY" ? `${formatDate(a.publishedAt ?? a.createdAt)}${a.publishedAt && a.publishedAt > new Date() ? " (hẹn giờ)" : ""} · ${(a.author?.fullName ?? "—")}` : `${formatDate(a.publishedAt ?? a.createdAt)}${a.publishedAt && a.publishedAt > new Date() ? " (hẹn giờ)" : ""}`} · ${a.viewCount.toLocaleString("vi-VN")} lượt xem`,
            badge: <ArticleStatus published={a.published} pending={!a.published && a.author?.role === "SECRETARY"} />,
            href: `${base}/${a.id}`,
          }))} />
          <div className="max-sm:hidden">
            <DataTable>
              <thead><tr><Th>Tiêu đề</Th>{isPlan && <Th>Danh mục</Th>}<Th>Người đăng</Th><Th>Ngày đăng</Th><Th>Trạng thái</Th><Th className="text-right">Lượt xem</Th></tr></thead>
              <tbody>{items.map((a) => (
                <ClickRow key={a.id} href={`${base}/${a.id}`}>
                  <Td className="max-w-lg font-medium"><Link href={`${base}/${a.id}`} className="hover:text-primary">{a.title}</Link></Td>
                  {isPlan && <Td className="whitespace-nowrap">{a.category?.name ?? <span className="text-muted">Chưa phân loại</span>}</Td>}
                  <Td className="whitespace-nowrap">{(a.author?.fullName ?? "—")}</Td>
                  <Td className="whitespace-nowrap">{formatDate(a.publishedAt ?? a.createdAt)}{a.publishedAt && a.publishedAt > new Date() && <div className="text-xs text-warning">Hẹn giờ</div>}</Td>
                  <Td><ArticleStatus published={a.published} pending={!a.published && a.author?.role === "SECRETARY"} /></Td>
                  <Td className="text-right whitespace-nowrap tabular-nums"><span className="inline-flex items-center gap-1.5 text-muted"><Eye className="size-4" />{a.viewCount.toLocaleString("vi-VN")}</span></Td>
                </ClickRow>
              ))}</tbody>
            </DataTable>
          </div>
        </>
      )}
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath={base} params={{ q, dm }} />
    </>
  );
}
