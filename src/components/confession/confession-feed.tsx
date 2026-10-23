"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Heart, MessageCircle, Plus, Send, Trash2 } from "lucide-react";
import { addConfessionCommentAction, deleteConfessionCommentAction, loadMoreConfessionsAction, toggleConfessionLikeAction } from "@/actions/confessions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { cn, relativeTime } from "@/utils";
import { ConfessionForm } from "./confession-form";

export type FeedComment = { id: string; authorName: string; content: string; createdAt: string };
export type FeedItem = { id: string; content: string; nickname: string | null; at: string; likes: number; liked: boolean; comments: FeedComment[] };

const initial = (name: string) => (name.trim().split(/\s+/).pop() ?? "?").charAt(0).toUpperCase();
function Avatar({ name, anon }: { name: string; anon?: boolean }) {
  return <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold", anon ? "bg-slate-200 text-slate-600" : "bg-primary-light text-primary-dark")}>{anon ? "?" : initial(name)}</span>;
}

export function ConfessionFeed({ items: initialItems, hasMore: initialHasMore, isAdmin, loggedIn }: { items: FeedItem[]; hasMore: boolean; isAdmin: boolean; loggedIn: boolean }) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const open = items.find((i) => i.id === openId) ?? null;
  const patch = (id: string, f: (i: FeedItem) => FeedItem) => setItems((xs) => xs.map((x) => (x.id === id ? f(x) : x)));

  async function loadMore() {
    setLoadingMore(true);
    const res = await loadMoreConfessionsAction(items.length);
    setLoadingMore(false);
    if (!res.ok || !res.data) return void toast.error(res.ok ? "Không tải được thêm" : res.error);
    const more = res.data.items;
    setItems((xs) => [...xs, ...more.filter((m) => !xs.some((x) => x.id === m.id))]); // bỏ bài trùng nếu có bài mới xen vào
    setHasMore(res.data.hasMore);
  }
  async function like(id: string) {
    const cur = items.find((i) => i.id === id)!;
    patch(id, (i) => ({ ...i, liked: !i.liked, likes: i.likes + (i.liked ? -1 : 1) })); // cập nhật ngay, sai thì hoàn lại
    const res = await toggleConfessionLikeAction(id);
    if (!res.ok) { patch(id, () => cur); return void toast.error(res.error); }
    if (res.data) patch(id, (i) => ({ ...i, liked: res.data!.liked, likes: res.data!.count }));
  }
  async function comment() {
    if (!open || !text.trim()) return;
    setBusy(true);
    const res = await addConfessionCommentAction(open.id, { content: text });
    setBusy(false);
    if (!res.ok) return void toast.error(res.error);
    patch(open.id, (i) => ({ ...i, comments: [...i.comments, res.data!] }));
    setText("");
  }
  async function removeComment(postId: string, id: string) {
    const res = await deleteConfessionCommentAction(id);
    if (!res.ok) return void toast.error(res.error);
    patch(postId, (i) => ({ ...i, comments: i.comments.filter((c) => c.id !== id) }));
  }

  return (
    <div className="w-full">
      <button onClick={() => setComposing(true)} className="mb-4 flex w-full items-center gap-3 rounded-lg border border-border bg-white/90 p-3 text-left shadow-sm hover:bg-white">
        <span className="flex size-9 items-center justify-center rounded-full bg-primary text-white"><Plus className="size-5" /></span>
        <span className="flex-1 rounded-full bg-slate-100 px-4 py-2 text-sm text-muted">Bạn muốn confession điều gì? Gửi ẩn danh đến Ban chấp hành duyệt…</span>
      </button>

      {items.length === 0 ? <p className="py-8 text-center text-sm text-muted">Chưa có confession nào được đăng.</p> : (
        <div className="space-y-4">
          {items.map((c) => (
            <article key={c.id} className="rounded-lg border border-border bg-white/90 shadow-sm">
              <div className="flex items-center gap-3 px-4 pt-4">
                <Avatar name={c.nickname ?? ""} anon={!c.nickname} />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{c.nickname || "Ẩn danh"}</div>
                  <div className="text-xs text-muted">{relativeTime(c.at)}</div>
                </div>
              </div>
              <button onClick={() => setOpenId(c.id)} className="block w-full px-4 py-3 text-left">
                <p className="line-clamp-6 whitespace-pre-wrap break-words">{c.content}</p>
              </button>
              <div className="flex items-center justify-between px-4 text-xs text-muted">
                <span className="flex items-center gap-1"><Heart className="size-3.5 fill-red-500 text-red-500" />{c.likes}</span>
                <button onClick={() => setOpenId(c.id)} className="hover:underline">{c.comments.length} bình luận</button>
              </div>
              <div className="mt-2 grid grid-cols-2 border-t border-border">
                <button onClick={() => like(c.id)} className={cn("flex items-center justify-center gap-2 py-2 text-sm font-medium hover:bg-slate-50", c.liked ? "text-red-600" : "text-muted")}>
                  <Heart className={cn("size-4", c.liked && "fill-current")} />Thích
                </button>
                <button onClick={() => setOpenId(c.id)} className="flex items-center justify-center gap-2 py-2 text-sm font-medium text-muted hover:bg-slate-50">
                  <MessageCircle className="size-4" />Bình luận
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      {hasMore && <div className="mt-4 text-center"><Button variant="secondary" loading={loadingMore} onClick={loadMore}>Xem thêm</Button></div>}

      <Modal open={composing} onClose={() => setComposing(false)} title="Tạo confession mới">
        <ConfessionForm onDone={() => { setComposing(false); router.refresh(); }} />
      </Modal>

      <Modal open={!!open} onClose={() => { setOpenId(null); setText(""); }} title={open ? `Confession của ${open.nickname || "Ẩn danh"}` : ""} className="max-w-xl">
        {open && (
          <div>
            <p className="whitespace-pre-wrap break-words">{open.content}</p>
            <div className="mt-1 text-xs text-muted">{relativeTime(open.at)}</div>
            <div className="mt-3 flex items-center justify-between border-y border-border py-1">
              <button onClick={() => like(open.id)} className={cn("flex items-center gap-2 rounded px-2 py-1.5 text-sm font-medium hover:bg-slate-50", open.liked ? "text-red-600" : "text-muted")}>
                <Heart className={cn("size-4", open.liked && "fill-current")} />{open.likes} lượt thích
              </button>
              <span className="text-sm text-muted">{open.comments.length} bình luận</span>
            </div>
            <ul className="mt-3 max-h-[40vh] space-y-3 overflow-y-auto">
              {open.comments.length === 0 && <li className="py-2 text-center text-sm text-muted">Chưa có bình luận. Hãy là người đầu tiên!</li>}
              {open.comments.map((m) => (
                <li key={m.id} className="flex gap-2">
                  <Avatar name={m.authorName} anon={m.authorName === "Ẩn danh"} />
                  <div className="min-w-0 flex-1">
                    <div className="rounded-2xl bg-slate-100 px-3 py-2">
                      <div className="text-[13px] font-semibold">{m.authorName}</div>
                      <p className="whitespace-pre-wrap break-words text-sm">{m.content}</p>
                    </div>
                    <div className="ml-3 mt-0.5 flex gap-3 text-xs text-muted">
                      <span>{relativeTime(m.createdAt)}</span>
                      {isAdmin && <button onClick={() => removeComment(open.id, m.id)} className="flex items-center gap-1 text-danger hover:underline"><Trash2 className="size-3" />Xóa</button>}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); void comment(); }}>
              <Input maxLength={500} value={text} onChange={(e) => setText(e.target.value)} placeholder={loggedIn ? "Viết bình luận…" : "Bình luận ẩn danh…"} />
              <Button type="submit" loading={busy} disabled={!text.trim()} aria-label="Gửi bình luận"><Send className="size-4" /></Button>
            </form>
          </div>
        )}
      </Modal>
    </div>
  );
}
