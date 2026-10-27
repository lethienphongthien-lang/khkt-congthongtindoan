import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Eye, MessageSquare, Pencil } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { KIND_LABEL, KIND_PATH, getArticle, relatedArticles } from "@/lib/services/public";
import { formatDate, formatDateTime } from "@/utils";
import { RichText } from "@/components/public/rich-text";
import { ViewTracker } from "@/components/public/view-tracker";
import { Attachments } from "@/components/public/attachments";
import { Block, SideArticleList } from "@/components/public/blocks";
import { ForumDiscussion } from "@/components/public/forum-discussion";
import { getForumComments } from "@/actions/forum";
import { kindSlug } from "@/lib/services/kind";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const a = await getArticle((await params).slug);
  if (!a) return {};
  return {
    title: `${a.title} - Diễn đàn`,
    description: a.summary ?? undefined,
  };
}

export default async function DienDanDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const slug = (await params).slug;
  const a = await getArticle(slug);
  if (!a) notFound();

  const user = await getCurrentUser();
  const canEdit = user?.role === "ADMIN";
  const views =
    (await db.article.findUnique({ where: { id: a.id }, select: { viewCount: true } }))?.viewCount ??
    a.viewCount;

  const [comments, related] = await Promise.all([
    getForumComments(a.id),
    relatedArticles(a),
  ]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <article className="min-w-0 lg:col-span-2">
        <ViewTracker id={a.id} />
        <nav className="mb-3 text-[13px] text-muted">
          <Link href="/" className="hover:text-primary">
            Trang chủ
          </Link>{" "}
          ›{" "}
          <Link href="/dien-dan" className="hover:text-primary font-medium text-primary">
            Diễn đàn
          </Link>
        </nav>

        <div className="flex items-start gap-2">
          <h1 className="min-w-0 flex-1 text-2xl font-bold text-primary-dark sm:text-3xl">
            {a.title}
          </h1>
          {canEdit && (
            <Link
              href={`/cms/${kindSlug(a.kind)}/${a.id}/edit`}
              title="Sửa bài viết"
              aria-label="Sửa bài viết"
              className="mt-1 shrink-0 rounded-full border border-border bg-white p-2 text-primary shadow-xs hover:bg-primary-light"
            >
              <Pencil className="size-4" />
            </Link>
          )}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border pb-3 text-sm text-muted">
          {a.publishedAt && <span>{formatDate(a.publishedAt)}</span>}
          <span className="inline-flex items-center gap-1">
            <Eye className="size-4" />
            {views.toLocaleString("vi-VN")} lượt xem
          </span>
          <span className="inline-flex items-center gap-1 font-medium text-primary">
            <MessageSquare className="size-4" />
            {comments.length} thảo luận
          </span>
          {a.category && (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-800">
              {a.category.name}
            </span>
          )}
          {a.department && (
            <span className="rounded bg-primary-light px-1.5 py-0.5 font-medium text-primary-dark">
              Chi đoàn {a.department.name}
            </span>
          )}
          {a.author && <span>Đăng bởi {a.author.fullName}</span>}
        </div>

        {a.summary && (
          <p className="mt-4 rounded-r-lg border-l-4 border-primary bg-primary-light/40 p-3 text-sm font-medium text-slate-800 sm:text-base">
            {a.summary}
          </p>
        )}

        <div className="mt-4 overflow-x-auto rounded bg-white/85 p-5">
          <RichText text={a.content} />
        </div>

        {a.attachments && a.attachments.length > 0 && (
          <div className="mt-6 border-t border-border pt-4">
            <Attachments files={a.attachments.map((f) => ({ id: f.id, name: f.name, url: f.url, size: f.size }))} />
          </div>
        )}

        {/* Mục Thảo luận & Bình luận dưới bài viết */}
        <ForumDiscussion
          articleId={a.id}
          initialComments={comments}
          currentUser={user ? { fullName: user.fullName, role: user.role } : null}
        />
      </article>

      {/* Cột bài viết liên quan */}
      <aside className="space-y-6">
        {related.filter((g) => g.items.length > 0).map((g) => (
          <Block key={g.kind} title={`${KIND_LABEL[g.kind]} khác`} href={KIND_PATH[g.kind]}>
            <SideArticleList items={g.items} />
          </Block>
        ))}
      </aside>
    </div>
  );
}
