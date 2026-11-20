"use client";

import { useState } from "react";
import { formatDateTime } from "@/utils";
import { MessageSquare, Send, Trash2, User } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import { addForumCommentAction, deleteForumCommentAction, type ForumCommentDTO } from "@/actions/forum";

export function ForumDiscussion({
  articleId,
  initialComments = [],
  currentUser,
}: {
  articleId: string;
  initialComments: ForumCommentDTO[];
  currentUser?: { fullName: string; role: string } | null;
}) {
  const t = useT();
  const [comments, setComments] = useState<ForumCommentDTO[]>(initialComments);
  const [content, setContent] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await addForumCommentAction(articleId, {
        content: content.trim(),
        authorName: currentUser ? undefined : name.trim() || undefined,
      });
      if (res.ok) {
        if (res.data) setComments((prev) => [...prev, res.data!]);
        setContent("");
      } else {
        setError(res.error || t("community.fd.errSend"));
      }
    } catch {
      setError(t("community.fd.errConn"));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(t("community.fd.confirmDelete"))) return;
    try {
      const res = await deleteForumCommentAction(id);
      if (res.ok) {
        setComments((prev) => prev.filter((c) => c.id !== id));
      } else {
        alert(res.error || t("community.fd.errDelete"));
      }
    } catch {
      alert(t("community.fd.errDeleteConn"));
    }
  }

  return (
    <section className="mt-8 rounded-xl border border-border bg-white/90 p-5 shadow-xs sm:p-6" aria-label={t("community.fd.section")}>
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <MessageSquare className="size-5 text-primary" />
        <h2 className="text-lg font-bold text-slate-800">
          {t("community.fd.heading")} <span className="text-sm font-normal text-muted">({t("community.fd.opinions", { n: comments.length })})</span>
        </h2>
      </div>

      {/* Form bình luận */}
      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        {!currentUser && (
          <div className="flex items-center gap-2">
            <User className="size-4 text-slate-400" />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("community.fd.namePh")}
              maxLength={50}
              className="w-full max-w-xs rounded-md border border-slate-300 px-3 py-1.5 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        )}

        <div>
          <textarea
            required
            rows={3}
            maxLength={1000}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t("community.fd.contentPh")}
            className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {error && <p className="text-xs text-rose-600">{error}</p>}

        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted">{t("community.fd.civil")}</span>
          <button
            type="submit"
            disabled={busy || content.trim().length < 2}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-primary-dark disabled:opacity-50"
          >
            <Send className="size-3.5" />
            {busy ? t("community.sending") : t("community.fd.submit")}
          </button>
        </div>
      </form>

      {/* Danh sách bình luận */}
      <div className="mt-6 space-y-3.5 divide-y divide-slate-100">
        {comments.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted">
            {t("community.fd.empty")}
          </div>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="pt-3.5 first:pt-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-slate-800">{c.authorName}</span>
                  <span className="text-[11px] text-slate-400">{formatDateTime(new Date(c.createdAt))}</span>
                </div>
                {c.canDelete && (
                  <button
                    type="button"
                    onClick={() => handleDelete(c.id)}
                    title={t("community.fd.deleteTitle")}
                    className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
              <p className="mt-1 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{c.content}</p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
