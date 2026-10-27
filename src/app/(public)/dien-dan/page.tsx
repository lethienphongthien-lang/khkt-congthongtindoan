import type { Metadata } from "next";
import Link from "next/link";
import { listForumArticles } from "@/lib/services/public";
import { pageParam } from "@/utils";
import { EmptyPublic, PageTitle } from "@/components/public/blocks";
import { Pagination } from "@/components/ui/misc";
import { db } from "@/lib/db";
import { CalendarDays, Eye, MessageSquare } from "lucide-react";
import { formatDate } from "@/utils";
import { cdnImage } from "@/lib/image-url";

export const metadata: Metadata = {
  title: "Diễn đàn thanh niên",
  description: "Diễn đàn trao đổi, thảo luận các chủ đề học đường, kỹ năng sống và phong trào Đoàn trường THPT Sơn Hà.",
};

const PAGE_SIZE = 10;

export default async function DienDanPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const page = pageParam((await searchParams).page);
  const { items, total } = await listForumArticles(page, PAGE_SIZE);

  // Lấy số lượng bình luận cho mỗi bài viết
  const countsMap = new Map<string, number>();
  if (items.length > 0) {
    const counts = await db.feedback.groupBy({
      by: ["category"],
      where: {
        category: { in: items.map((a) => `forum:${a.id}`) },
      },
      _count: true,
    });
    for (const c of counts) {
      if (c.category) {
        const id = c.category.replace(/^forum:/, "");
        countsMap.set(id, c._count);
      }
    }
  }

  return (
    <div className="space-y-6">
      <PageTitle
        title="Diễn đàn thanh niên"
        description="Không gian bài viết và thảo luận đa chiều về các vấn đề học đường, kỹ năng sống, phong trào Đoàn và những chủ đề học sinh quan tâm."
      />

      {items.length === 0 ? (
        <div className="rounded-xl border border-border bg-white/85 p-6">
          <EmptyPublic text="Chưa có chủ đề thảo luận nào trong Diễn đàn. Các bài viết và chủ đề trao đổi mới sẽ được Đoàn trường đăng tải tại đây." />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((a) => {
            const commentsCount = countsMap.get(a.id) ?? 0;
            return (
              <article
                key={a.id}
                className="group flex flex-col overflow-hidden rounded-xl border border-border bg-white/90 shadow-xs transition hover:border-primary/40 hover:shadow-md"
              >
                {a.coverUrl && (
                  <Link href={`/dien-dan/${a.slug}`} className="aspect-video w-full overflow-hidden bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={cdnImage(a.coverUrl, 640)}
                      alt={a.title}
                      loading="lazy"
                      className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </Link>
                )}
                <div className="flex flex-1 flex-col p-4 sm:p-5">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                    {a.publishedAt && (
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="size-3.5" />
                        {formatDate(a.publishedAt)}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <Eye className="size-3.5" />
                      {a.viewCount}
                    </span>
                    <span className="inline-flex items-center gap-1 font-medium text-primary">
                      <MessageSquare className="size-3.5" />
                      {commentsCount} thảo luận
                    </span>
                  </div>

                  <h2 className="mt-2 text-base font-bold text-slate-800 transition group-hover:text-primary sm:text-lg">
                    <Link href={`/dien-dan/${a.slug}`} className="line-clamp-2">
                      {a.title}
                    </Link>
                  </h2>

                  {a.summary && (
                    <p className="mt-2 line-clamp-3 text-xs text-slate-600 leading-relaxed sm:text-sm">
                      {a.summary}
                    </p>
                  )}

                  <div className="mt-auto pt-4">
                    <Link
                      href={`/dien-dan/${a.slug}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                    >
                      Xem bài viết & Tham gia thảo luận →
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath="/dien-dan" params={{}} />
    </div>
  );
}

