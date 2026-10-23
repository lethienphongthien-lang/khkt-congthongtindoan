"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDown, ChevronLeft, ChevronRight, FileText, Loader2, Paperclip, Send, Trash2, Users, X } from "lucide-react";
import { deleteTeamMessageAction, sendTeamMessageAction } from "@/actions/team-chat";
import { Avatar } from "@/components/ui/misc";
import { cdnImage } from "@/lib/image-url";
import { cn } from "@/utils";
import { Modal } from "@/components/ui/modal";
import type { ChatAttachment, ChatMemberDTO, ChatMessageDTO } from "@/lib/services/team-chat";

const POLL_MS = 2500;
const LIMITS = { image: 10, video: 50, file: 10 } as const; // MB, theo gói Cloudinary miễn phí
const FILE_EXT = new Set(["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv", "zip", "rar"]);

type Pending = { key: string; file: File; kind: ChatAttachment["kind"]; progress: number; done?: ChatAttachment; error?: string };

const kindOf = (f: File): ChatAttachment["kind"] | null => {
  if (f.type.startsWith("image/")) return "image";
  if (f.type.startsWith("video/")) return "video";
  const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
  return FILE_EXT.has(ext) ? "file" : null;
};
const fmtSize = (b: number) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const dayKey = (iso: string) => new Date(iso).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
const dayLabel = (iso: string) => {
  const today = new Date().toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
  const yest = new Date(Date.now() - 86400000).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
  const k = dayKey(iso);
  return k === today ? "Hôm nay" : k === yest ? "Hôm qua" : k;
};
const timeOf = (iso: string) => new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" });

/** Tải thẳng lên Cloudinary bằng chữ ký do máy chủ cấp (có thanh tiến trình). */
function uploadToCloudinary(file: File, onProgress: (p: number) => void): Promise<ChatAttachment> {
  return new Promise(async (resolve, reject) => {
    try {
      const sres = await fetch("/api/team-chat/sign", { method: "POST" });
      const sign = await sres.json();
      if (!sres.ok) return reject(new Error(sign.error ?? "Không lấy được quyền tải tệp"));
      const kind = kindOf(file)!;
      const fd = new FormData();
      fd.set("file", file); fd.set("api_key", sign.apiKey); fd.set("timestamp", String(sign.timestamp)); fd.set("signature", sign.signature); fd.set("folder", sign.folder);
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `https://api.cloudinary.com/v1_1/${sign.cloudName}/auto/upload`);
      xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
      xhr.onerror = () => reject(new Error("Mất kết nối khi tải tệp"));
      xhr.onload = () => {
        try {
          const r = JSON.parse(xhr.responseText);
          if (xhr.status >= 300) return reject(new Error(r?.error?.message ?? "Tải tệp thất bại"));
          resolve({ url: r.secure_url, publicId: r.public_id, name: file.name, size: file.size, mime: file.type || "application/octet-stream", kind });
        } catch { reject(new Error("Tải tệp thất bại")); }
      };
      xhr.send(fd);
    } catch (e) { reject(e instanceof Error ? e : new Error("Tải tệp thất bại")); }
  });
}

function AttachmentView({ a, mine }: { a: ChatAttachment; mine: boolean }) {
  if (a.kind === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <a href={a.url} target="_blank" rel="noreferrer"><img src={cdnImage(a.url, 640)} alt={a.name} loading="lazy" className="max-h-72 max-w-full rounded-lg object-cover" /></a>
    );
  }
  if (a.kind === "video") return <video src={a.url} controls preload="metadata" className="max-h-72 max-w-full rounded-lg bg-black" />;
  return (
    <a href={a.url} target="_blank" rel="noreferrer" download={a.name} className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 text-sm", mine ? "border-white/30 bg-white/15 text-white" : "border-border bg-white hover:bg-slate-50")}>
      <FileText className="size-5 shrink-0" /><span className="min-w-0"><span className="block max-w-56 truncate font-medium">{a.name}</span><span className={cn("text-xs", mine ? "text-white/80" : "text-muted")}>{fmtSize(a.size)}</span></span>
    </a>
  );
}

export function ChatRoom({ me, initial, members, pageSize, realtime }: { me: { id: string; role: "ADMIN" | "SECRETARY" }; initial: ChatMessageDTO[]; members: ChatMemberDTO[]; pageSize: number; realtime: { key: string; cluster: string } | null }) {
  const [msgs, setMsgs] = useState<ChatMessageDTO[]>(initial);
  const [text, setText] = useState("");
  const [pending, setPending] = useState<Pending[]>([]);
  const [sending, setSending] = useState(false);
  const [lost, setLost] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const router = useRouter();
  const [vv, setVv] = useState<{ h: number; top: number } | null>(null);
  const [hasOlder, setHasOlder] = useState(initial.length >= pageSize);
  const [newBelow, setNewBelow] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const cursor = useRef(initial.length ? initial.reduce((m, x) => (x.updatedAt > m ? x.updatedAt : m), initial[0].updatedAt) : new Date(0).toISOString());
  const stick = useRef(true);

  const merge = useCallback((incoming: ChatMessageDTO[]) => {
    if (!incoming.length) return;
    setMsgs((cur) => {
      const map = new Map(cur.map((m) => [m.id, m]));
      for (const m of incoming) map.set(m.id, m);
      return [...map.values()].sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
    });
    for (const m of incoming) if (m.updatedAt > cursor.current) cursor.current = m.updatedAt;
  }, []);

  // Trang chat chiếm vừa khung hình: bỏ phần đệm/chiều cao tối thiểu của trang để cả trang không còn cuộn, chỉ vùng tin nhắn được cuộn
  useEffect(() => {
    const html = document.documentElement;
    html.classList.add("chat-page");
    return () => html.classList.remove("chat-page");
  }, []);

  // Ô nhập tự cao lên theo nội dung, tối đa 4 dòng (112px), quá thì cuộn trong ô
  useLayoutEffect(() => {
    const el = area.current; if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 112)}px`;
  }, [text]);

  // Điện thoại: chat chiếm trọn màn hình và bám theo vùng nhìn thấy (visualViewport). Khi bàn phím bật lên chỉ vùng tin nhắn co lại, phần tiêu đề đứng yên, ô nhập nằm ngay trên bàn phím.
  useEffect(() => {
    const v = window.visualViewport; if (!v) return;
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => {
      if (!mq.matches) return setVv(null);
      setVv({ h: Math.round(v.height), top: Math.round(v.offsetTop) });
      if (stick.current) requestAnimationFrame(() => { const el = box.current; if (el) el.scrollTop = el.scrollHeight; });
    };
    update();
    v.addEventListener("resize", update); v.addEventListener("scroll", update); mq.addEventListener("change", update);
    return () => { v.removeEventListener("resize", update); v.removeEventListener("scroll", update); mq.removeEventListener("change", update); };
  }, []);

  const scrollDown = (smooth = false) => { const el = box.current; if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" }); };
  useLayoutEffect(() => { scrollDown(); }, []);
  useLayoutEffect(() => { if (stick.current) scrollDown(); else setNewBelow(true); }, [msgs.length]);

  // Cập nhật tin mới: có Pusher thì nhận qua WSS tức thì (hỏi lại thưa 20 giây để đối chiếu); không có thì hỏi lại mỗi 2,5 giây khi tab đang hiển thị
  const [live, setLive] = useState(false);
  useEffect(() => {
    let stop = false; let busy = false;
    async function tick(markRead = false) {
      if (busy || document.visibilityState !== "visible") return;
      busy = true;
      try {
        const res = await fetch(`/api/team-chat?since=${encodeURIComponent(cursor.current)}${markRead ? "&read=1" : ""}`, { cache: "no-store" });
        if (res.status === 403) { if (!stop) setLost(true); return; }
        if (res.ok) { const j = await res.json(); if (!stop) merge(j.messages); }
      } catch { /* mất mạng: thử lại ở lần sau */ } finally { busy = false; }
    }
    void tick(true);
    const t = setInterval(() => void tick(), live ? 20000 : POLL_MS);
    const onVis = () => { if (document.visibilityState === "visible") void tick(true); };
    document.addEventListener("visibilitychange", onVis);
    return () => { stop = true; clearInterval(t); document.removeEventListener("visibilitychange", onVis); };
  }, [merge, live]);

  useEffect(() => {
    if (!realtime) return;
    let cancelled = false; let cleanup = () => {};
    (async () => {
      const { default: Pusher } = await import("pusher-js");
      if (cancelled) return;
      const client = new Pusher(realtime.key, { cluster: realtime.cluster, channelAuthorization: { endpoint: "/api/team-chat/pusher-auth", transport: "ajax" } });
      const ch = client.subscribe("private-team-chat");
      const onMsg = (m: ChatMessageDTO) => { merge([m]); if (document.visibilityState === "visible") void fetch(`/api/team-chat?since=${encodeURIComponent(new Date().toISOString())}&read=1`, { cache: "no-store" }); };
      ch.bind("message", onMsg); ch.bind("update", (m: ChatMessageDTO) => merge([m]));
      ch.bind("pusher:subscription_succeeded", () => !cancelled && setLive(true));
      ch.bind("pusher:subscription_error", () => !cancelled && setLive(false));
      client.connection.bind("unavailable", () => !cancelled && setLive(false));
      cleanup = () => { ch.unbind_all(); client.unsubscribe("private-team-chat"); client.disconnect(); };
    })();
    return () => { cancelled = true; cleanup(); setLive(false); };
  }, [realtime, merge]);

  function onScroll() {
    const el = box.current; if (!el) return;
    stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (stick.current) setNewBelow(false);
  }

  async function loadOlder() {
    const first = msgs[0]; if (!first) return;
    const el = box.current; const prevH = el?.scrollHeight ?? 0;
    const res = await fetch(`/api/team-chat?limit=${pageSize}&before=${encodeURIComponent(first.createdAt)}`, { cache: "no-store" });
    if (!res.ok) return;
    const j = await res.json();
    if (j.messages.length < pageSize) setHasOlder(false);
    stick.current = false;
    setMsgs((cur) => { const ids = new Set(cur.map((m) => m.id)); return [...j.messages.filter((m: ChatMessageDTO) => !ids.has(m.id)), ...cur]; });
    requestAnimationFrame(() => { if (el) el.scrollTop = el.scrollHeight - prevH; });
  }

  async function addFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (pending.length + list.length > 10) return void toast.error("Tối đa 10 tệp mỗi tin");
    for (const file of list) {
      const kind = kindOf(file);
      if (!kind) { toast.error(`${file.name}: loại tệp không được hỗ trợ`); continue; }
      if (file.size > LIMITS[kind] * 1048576) { toast.error(`${file.name}: tối đa ${LIMITS[kind]}MB cho ${kind === "image" ? "ảnh" : kind === "video" ? "video" : "tệp"}`); continue; }
      const key = `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 7)}`;
      setPending((p) => [...p, { key, file, kind, progress: 0 }]);
      uploadToCloudinary(file, (progress) => setPending((p) => p.map((x) => (x.key === key ? { ...x, progress } : x))))
        .then((done) => setPending((p) => p.map((x) => (x.key === key ? { ...x, done, progress: 100 } : x))))
        .catch((e: Error) => { setPending((p) => p.map((x) => (x.key === key ? { ...x, error: e.message } : x))); toast.error(`${file.name}: ${e.message}`); });
    }
  }

  const uploading = pending.some((p) => !p.done && !p.error);
  const ready = pending.filter((p) => p.done).map((p) => p.done!);
  const canSend = !sending && !uploading && (text.trim().length > 0 || ready.length > 0);

  async function send() {
    if (!canSend) return;
    setSending(true);
    const res = await sendTeamMessageAction({ content: text.trim() || undefined, attachments: ready });
    setSending(false);
    if (!res.ok) return void toast.error(res.error);
    setText(""); setPending([]); stick.current = true;
    if (res.data) merge([res.data as ChatMessageDTO]);
  }

  async function remove(id: string) {
    if (!confirm("Thu hồi tin nhắn này?")) return;
    const res = await deleteTeamMessageAction(id);
    if (!res.ok) return void toast.error(res.error);
    setMsgs((cur) => cur.map((m) => (m.id === id ? { ...m, deleted: true, content: null, attachments: [] } : m)));
  }

  if (lost) return <div className="rounded-lg border border-border bg-white/85 p-8 text-center text-sm text-muted">Bạn không còn là Ban chấp hành hay Bí thư Chi đoàn nên đã rời khỏi kênh chat này.</div>;

  return (
    <div style={vv ? { top: vv.top, height: vv.h, bottom: "auto" } : undefined} className="fixed inset-x-0 top-0 bottom-0 z-[55] bg-[var(--color-background)] md:top-14 md:bottom-0 md:left-16 md:z-10 md:bg-transparent md:p-3 lg:left-60">
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white md:rounded-lg md:border md:border-border md:shadow-sm">
      <div className="flex shrink-0 items-center border-b border-border bg-white pt-[env(safe-area-inset-top)] md:pt-0">
      <button type="button" onClick={() => (window.history.length > 1 ? router.back() : router.push("/dashboard"))} aria-label="Quay lại" className="flex size-11 shrink-0 items-center justify-center text-primary md:hidden"><ChevronLeft className="size-6" /></button>
      <button type="button" onClick={() => setShowMembers(true)} aria-label="Xem thành viên của kênh" className="flex min-w-0 flex-1 items-center gap-3 py-2.5 pr-4 pl-1 text-left transition-colors hover:bg-slate-50 md:pl-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-white"><Users className="size-4.5" /></span>
        <span className="min-w-0 flex-1"><span className="block truncate text-[15px] font-semibold text-slate-900">Ban chấp hành &amp; Bí thư Chi đoàn</span><span className="block text-xs text-muted">{members.length} thành viên · bấm để xem danh sách</span></span>
        <ChevronRight className="size-4 shrink-0 text-muted" />
      </button>
      </div>
      <Modal open={showMembers} onClose={() => setShowMembers(false)} title={`Thành viên kênh (${members.length})`}>
        <p className="mb-3 text-xs text-muted">Ai đang là Ban chấp hành hoặc Bí thư Chi đoàn thì tự động ở trong kênh; hết vai trò thì tự rời kênh.</p>
        <ul className="-mx-1 max-h-[60vh] divide-y divide-border overflow-y-auto">
          {members.map((m) => (
            <li key={m.id} className="flex items-center gap-3 px-1 py-2">
              <Avatar name={m.name} src={m.avatar} size={36} />
              <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{m.name}{m.id === me.id && <span className="ml-1.5 text-xs font-normal text-muted">(Bạn)</span>}</div><div className="truncate text-xs text-muted">{m.label}</div></div>
              {m.role === "ADMIN" && <span className="shrink-0 rounded bg-primary-light px-1.5 py-0.5 text-[11px] font-medium text-primary-dark">Ban chấp hành</span>}
            </li>
          ))}
        </ul>
      </Modal>
      <div ref={box} onScroll={onScroll} className="relative min-h-0 flex-1 space-y-0.5 overflow-y-auto overscroll-contain px-3 py-3 sm:px-4">
        {hasOlder && <div className="pb-2 text-center"><button type="button" onClick={loadOlder} className="rounded-full border border-border bg-white px-3 py-1 text-xs text-primary hover:bg-primary-light">Xem thêm tin nhắn cũ</button></div>}
        {msgs.length === 0 && <p className="py-16 text-center text-sm text-muted">Chưa có tin nhắn nào. Hãy là người mở đầu cuộc trò chuyện.</p>}
        {msgs.map((m, i) => {
          const prev = msgs[i - 1];
          const mine = m.authorId === me.id;
          const newDay = !prev || dayKey(prev.createdAt) !== dayKey(m.createdAt);
          const grouped = !newDay && prev && prev.authorId === m.authorId && new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() < 5 * 60_000;
          return (
            <div key={m.id}>
              {newDay && <div className="my-3 flex justify-center"><span className="rounded-full bg-slate-100 px-3 py-0.5 text-[11px] font-medium text-muted">{dayLabel(m.createdAt)}</span></div>}
              <div className={cn("group flex gap-2", mine ? "flex-row-reverse" : "", grouped ? "mt-0.5" : "mt-2.5")}>
                {!mine && <div className="w-8 shrink-0">{!grouped && <Avatar name={m.authorName} src={m.authorAvatar} size={32} />}</div>}
                <div className={cn("flex max-w-[82%] flex-col sm:max-w-[70%]", mine ? "items-end" : "items-start")}>
                  {!grouped && !mine && <div className="mb-0.5 px-1 text-xs"><span className="font-semibold text-slate-700">{m.authorName}</span> <span className="text-muted">· {m.authorLabel}</span></div>}
                  <div className={cn("min-w-0 max-w-full space-y-1.5 rounded-2xl px-3 py-2 text-[14.5px] leading-snug break-words sm:text-[15px]", mine ? "rounded-br-md bg-primary text-white" : "rounded-bl-md bg-slate-100 text-slate-900", m.deleted && "bg-transparent text-muted italic ring-1 ring-border")}>
                    {m.deleted ? "Tin nhắn đã được thu hồi" : (
                      <>
                        {m.attachments.map((a) => <AttachmentView key={a.publicId} a={a} mine={mine} />)}
                        {m.content && <p className="whitespace-pre-wrap">{m.content}</p>}
                      </>
                    )}
                  </div>
                  <div className={cn("mt-0.5 flex items-center gap-1.5 px-1 text-[10px] text-muted", mine ? "flex-row-reverse" : "")}>
                      <span>{timeOf(m.createdAt)}</span>
                      {!m.deleted && (mine || me.role === "ADMIN") && <button type="button" onClick={() => remove(m.id)} aria-label="Thu hồi" title="Thu hồi tin nhắn" className="rounded p-0.5 hover:text-danger focus:outline-none"><Trash2 className="size-3" /></button>}
                    </div>
                </div>
              </div>
            </div>
          );
        })}
        {newBelow && <button type="button" onClick={() => { stick.current = true; setNewBelow(false); scrollDown(true); }} className="sticky bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-medium text-white shadow-lg"><ArrowDown className="size-3.5" />Tin nhắn mới</button>}
      </div>

      {pending.length > 0 && (
        <div className="flex shrink-0 gap-2 overflow-x-auto border-t border-border bg-slate-50 px-3 py-2">
          {pending.map((p) => (
            <div key={p.key} className="relative flex w-40 shrink-0 items-center gap-2 rounded-lg border border-border bg-white px-2 py-1.5 text-xs">
              {p.done ? <Paperclip className="size-4 shrink-0 text-primary" /> : p.error ? <X className="size-4 shrink-0 text-danger" /> : <Loader2 className="size-4 shrink-0 animate-spin text-primary" />}
              <span className="min-w-0 flex-1"><span className="block truncate font-medium">{p.file.name}</span><span className={p.error ? "text-danger" : "text-muted"}>{p.error ?? (p.done ? fmtSize(p.file.size) : `${p.progress}%`)}</span></span>
              <button type="button" onClick={() => setPending((x) => x.filter((y) => y.key !== p.key))} aria-label="Bỏ tệp" className="rounded p-0.5 text-muted hover:text-danger"><X className="size-3.5" /></button>
            </div>
          ))}
        </div>
      )}

      <div className="flex shrink-0 items-end gap-2 border-t border-border bg-white px-3 py-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))]">
        <input ref={fileInput} type="file" multiple hidden accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar" onChange={(e) => { if (e.target.files) void addFiles(e.target.files); e.target.value = ""; }} />
        <button type="button" onClick={() => fileInput.current?.click()} aria-label="Đính kèm ảnh, video, tệp" title="Đính kèm ảnh, video, tệp" className="flex size-10 shrink-0 items-center justify-center rounded-full text-primary hover:bg-primary-light"><Paperclip className="size-5" /></button>
        <textarea ref={area} value={text} rows={1} maxLength={4000} placeholder="Nhập tin nhắn…" enterKeyHint="send"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send(); } }}
          onPaste={(e) => { const fs = Array.from(e.clipboardData.files); if (fs.length) { e.preventDefault(); void addFiles(fs); } }}
          className="max-h-28 min-h-10 min-w-0 flex-1 resize-none overflow-y-auto rounded-2xl [overflow-wrap:anywhere] border border-border bg-slate-50 px-3.5 py-2 text-[16px] leading-6 sm:text-[15px] outline-none focus:border-primary" />
        <button type="button" onClick={() => void send()} disabled={!canSend} aria-label="Gửi" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-white transition-opacity disabled:opacity-40">{sending ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}</button>
      </div>
    </div>
    </div>
  );
}
