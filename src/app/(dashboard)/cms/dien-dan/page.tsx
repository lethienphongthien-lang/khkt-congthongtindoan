import Link from "next/link";
import { ClickRow } from "@/components/ui/click-row";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { formatDate, formatDateTime, pageParam } from "@/utils";
import { buttonClass } from "@/components/ui/button";
import { CompactList } from "@/components/ui/compact-list";
import { DataTable, EmptyState, PageHeader, Pagination, Td, Th } from "@/components/ui/misc";
import { ArticleStatus } from "@/components/cms/row-actions";
import { ExternalLink, MessageSquare, Plus, Trash2 } from "lucide-react";
import { deleteForumCommentAction } from "@/actions/forum";

export const metadata = { title: "Quản lý Diễn đàn" };
const PAGE_SIZE = 12;

export default async function CmsForumPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireRole(["ADMIN", "SECRETARY"]);
  const isAdmin = user.role === "ADMIN";
  const sp = await searchParams;
  const page = pageParam(sp.page);

  // Lấy các bài viết thuộc chuyên mục Diễn đàn
  const where = {
    category: { name: "Diễn đàn" },
    ...(isAdmin ? {} : { authorId: user.id }),
  };

  const [items, total, recentComments] = await Promise.all([
    db.article.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        author: { select: { fullName: true, role: true } },
      },
    }),
    db.article.count({ where }),
    // 10 ý kiến thảo luận mới nhất trên toàn diễn đàn để Admin kiểm duyệt
    isAdmin
      ? db.feedback.findMany({
          where: { category: { startsWith: "forum:" } },
          orderBy: { createdAt: "desc" },
          take: 10,
        })
      : Promise.resolve([]),
  ]);

  // Lấy số lượng bình luận cho mỗi chủ đề
  const commentCounts = new Map<string, number>();
  if (items.length > 0) {
    const counts = await db.feedback.groupBy({
      by: ["category"],
      where: {
        category: { in: items.map((i) => `forum:${i.id}`) },
      },
      _count: true,
    });
    for (const c of counts) {
      if (c.category) {
        commentCounts.set(c.category.replace(/^forum:/, ""), c._count);
      }
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý Diễn đàn"
        description="Đăng tải các chủ đề bài viết và quản lý ý kiến thảo luận của học sinh."
        actions={
          <div className="flex items-center gap-2">
            <Link href="/dien-dan" target="_blank" className={buttonClass("secondary")}>
              <ExternalLink className="size-4" />
              <span className="max-sm:hidden">Xem trang công khai</span>
            </Link>
            <Link href="/cms/dien-dan/new" className={buttonClass()}>
              <Plus className="size-4" />
              Tạo chủ đề thảo luận
            </Link>
          </div>
        }
      />

      {items.length === 0 ? (
        <div className="rounded-lg border border-border bg-white/85 p-6">
          <EmptyState
            title="Chưa có chủ đề diễn đàn nào"
            description="Hãy tạo chủ đề thảo luận đầu tiên để đoàn viên, học sinh cùng trao đổi và chia sẻ ý kiến."
            action={
              <Link href="/cms/dien-dan/new" className={buttonClass()}>
                <Plus className="size-4" />
                Tạo chủ đề đầu tiên
              </Link>
            }
          />
        </div>
      ) : (
        <>
          <CompactList
            items={items.map((a) => ({
              id: a.id,
              title: a.title,
              subtitle: `${formatDate(a.publishedAt ?? a.createdAt)} · ${a.viewCount} lượt xem · ${commentCounts.get(a.id) ?? 0} thảo luận`,
              badge: <ArticleStatus published={a.published} pending={!a.published && a.author?.role === "SECRETARY"} />,
              href: `/cms/dien-dan/${a.id}/edit`,
            }))}
          />

          <div className="max-sm:hidden">
            <DataTable>
              <thead>
                <tr>
                  <Th>Tiêu đề chủ đề</Th>
                  <Th>Người đăng</Th>
                  <Th>Ngày đăng</Th>
                  <Th className="text-center">Thảo luận</Th>
                  <Th className="text-right">Lượt xem</Th>
                  <Th>Trạng thái</Th>
                </tr>
              </thead>
              <tbody>
                {items.map((a) => (
                  <ClickRow key={a.id} href={`/cms/dien-dan/${a.id}/edit`}>
                    <Td className="max-w-lg font-medium">
                      <Link href={`/cms/dien-dan/${a.id}/edit`} className="hover:text-primary">
                        {a.title}
                      </Link>
                    </Td>
                    <Td className="whitespace-nowrap">{a.author?.fullName ?? "—"}</Td>
                    <Td className="whitespace-nowrap">{formatDate(a.publishedAt ?? a.createdAt)}</Td>
                    <Td className="text-center font-semibold text-primary">
                      {commentCounts.get(a.id) ?? 0}
                    </Td>
                    <Td className="text-right">{a.viewCount.toLocaleString("vi-VN")}</Td>
                    <Td>
                      <ArticleStatus published={a.published} pending={!a.published && a.author?.role === "SECRETARY"} />
                    </Td>
                  </ClickRow>
                ))}
              </tbody>
            </DataTable>
          </div>

          <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath="/cms/dien-dan" params={{}} />
        </>
      )}

      {/* Khu vực duyệt bình luận gần đây */}
      {isAdmin && recentComments.length > 0 && (
        <div className="rounded-xl border border-border bg-white/90 p-5 shadow-xs">
          <div className="mb-3 flex items-center gap-2 text-slate-800">
            <MessageSquare className="size-4 text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-wide">
              Ý kiến thảo luận gần đây của học sinh
            </h2>
          </div>
          <div className="divide-y divide-slate-100">
            {recentComments.map((c) => (
              <div key={c.id} className="flex items-start justify-between gap-4 py-3 first:pt-1">
                <div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-slate-800">{c.contact || "Học sinh"}</span>
                    <span className="text-[11px] text-muted">{formatDateTime(c.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-700 leading-relaxed">{c.content}</p>
                </div>
                <form
                  action={async () => {
                    "use server";
                    await deleteForumCommentAction(c.id);
                  }}
                >
                  <button
                    type="submit"
                    title="Xóa bình luận vi phạm"
                    className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </form>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

