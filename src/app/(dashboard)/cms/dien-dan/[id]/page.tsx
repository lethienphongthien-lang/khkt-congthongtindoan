import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, MessageSquare, Pencil, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { formatDate, formatDateTime } from "@/utils";
import { buttonClass } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/misc";
import { ArticleRowActions } from "@/components/cms/row-actions";
import { RichText } from "@/components/public/rich-text";
import { Attachments } from "@/components/public/attachments";
import { deleteForumCommentAction, getForumComments } from "@/actions/forum";

export default async function CmsForumDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole(["ADMIN", "SECRETARY"]);
  const isAdmin = user.role === "ADMIN";
  const { id } = await params;

  const a = await db.article.findUnique({
    where: { id },
    include: {
      attachments: { orderBy: { createdAt: "asc" } },
      author: { select: { fullName: true, role: true } },
    },
  });

  if (!a || (!isAdmin && a.authorId !== user.id)) notFound();
  const comments = await getForumComments(a.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={a.title}
        description={`Đăng bởi ${a.author?.fullName ?? "—"} · ${formatDate(a.publishedAt ?? a.createdAt)} · ${a.viewCount} lượt xem · ${comments.length} thảo luận`}
        stackActions
        actions={
          <div className="flex items-center gap-2">
            <Link href={`/dien-dan/${a.slug}`} target="_blank" className={buttonClass("secondary")}>
              <ExternalLink className="size-4" />
              <span className="max-sm:hidden">Xem trang công khai</span>
            </Link>
            <Link href={`/cms/dien-dan/${a.id}/edit`} className={buttonClass("secondary")}>
              <Pencil className="size-4" />
              Sửa bài
            </Link>
            {(isAdmin || !a.published) && (
              <ArticleRowActions id={a.id} published={a.published} base="/cms/dien-dan" backToList ownerOnly={!isAdmin} />
            )}
          </div>
        }
      />

      {a.summary && (
        <div className="rounded-lg border-l-4 border-primary bg-primary-light/30 p-4 text-sm font-medium text-slate-800">
          {a.summary}
        </div>
      )}

      <div className="rounded-xl border border-border bg-white p-5 shadow-xs">
        <RichText text={a.content} />
      </div>

      {a.attachments && a.attachments.length > 0 && (
        <Attachments files={a.attachments.map((f) => ({ id: f.id, name: f.name, url: f.url, size: f.size }))} />
      )}

      {/* Danh sách ý kiến thảo luận của học sinh trong bài viết này */}
      <div className="rounded-xl border border-border bg-white p-5 shadow-xs">
        <div className="mb-4 flex items-center gap-2 border-b border-border pb-3">
          <MessageSquare className="size-5 text-primary" />
          <h2 className="text-base font-bold text-slate-800">
            Ý kiến thảo luận của học sinh ({comments.length})
          </h2>
        </div>

        {comments.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted">
            Chưa có ý kiến thảo luận nào trong chủ đề này.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {comments.map((c) => (
              <div key={c.id} className="flex items-start justify-between gap-4 py-3 first:pt-0">
                <div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-slate-800">{c.authorName}</span>
                    <span className="text-[11px] text-muted">{formatDateTime(new Date(c.createdAt))}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{c.content}</p>
                </div>
                {isAdmin && (
                  <form
                    action={async () => {
                      "use server";
                      await deleteForumCommentAction(c.id);
                    }}
                  >
                    <button
                      type="submit"
                      title="Xóa bình luận này"
                      className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

