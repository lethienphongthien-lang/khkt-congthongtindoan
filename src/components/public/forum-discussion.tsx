"use client";

import { useState } from "react";
import { formatDateTime } from "@/utils";
import { MessageSquare, Send, Trash2, User } from "lucide-react";
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
        setError(res.error || "Không thể gửi bình luận lúc này.");
      }
    } catch {
      setError("Lỗi kết nối. Vui lòng thử lại sau.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Bạn có chắc chắn muốn xóa ý kiến này?")) return;
    try {
      const res = await deleteForumCommentAction(id);
      if (res.ok) {
        setComments((prev) => prev.filter((c) => c.id !== id));
      } else {
        alert(res.error || "Không thể xóa bình luận.");
      }
    } catch {
      alert("Lỗi kết nối khi xóa bình luận.");
    }
  }

  return (
    <section className="mt-8 rounded-xl border border-border bg-white/90 p-5 shadow-xs sm:p-6" aria-label="Mục thảo luận">
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <MessageSquare className="size-5 text-primary" />
        <h2 className="text-lg font-bold text-slate-800">
          Khu vực Thảo luận <span className="text-sm font-normal text-muted">({comments.length} ý kiến)</span>
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
              placeholder="Tên của bạn hoặc Chi đoàn (tùy chọn)"
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
            placeholder="Chia sẻ quan điểm, ý kiến hoặc câu hỏi của bạn về chủ đề này..."
            className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {error && <p className="text-xs text-rose-600">{error}</p>}

        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted">Hãy thảo luận văn minh, tôn trọng người khác.</span>
          <button
            type="submit"
            disabled={busy || content.trim().length < 2}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-primary-dark disabled:opacity-50"
          >
            <Send className="size-3.5" />
            {busy ? "Đang gửi..." : "Gửi ý kiến"}
          </button>
        </div>
      </form>

      {/* Danh sách bình luận */}
      <div className="mt-6 space-y-3.5 divide-y divide-slate-100">
        {comments.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted">
            Chưa có ý kiến thảo luận nào. Hãy là người đầu tiên chia sẻ góc nhìn của bạn!
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
                    title="Xóa bình luận này"
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
