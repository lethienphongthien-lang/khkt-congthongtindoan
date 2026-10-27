"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ExternalLink, Loader2, MessagesSquare, Send, X } from "lucide-react";
import { sendTeamMessageAction } from "@/actions/team-chat";
import { Avatar } from "@/components/ui/misc";
import { cdnImage } from "@/lib/image-url";
import { cn } from "@/utils";
import type { ChatMessageDTO } from "@/lib/services/team-chat";

export function TeamChatButton() {
  const [canChat, setCanChat] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; fullName: string; role: string } | null>(null);
  const [open, setOpen] = useState(false);
  const [hiddenByOther, setHiddenByOther] = useState(false);
  const [messages, setMessages] = useState<ChatMessageDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const cursor = useRef<string>(new Date(0).toISOString());

  // Đồng bộ đóng/ẩn khi khung chat khác (Trợ lý AI) đang mở để không đè lên nhau
  useEffect(() => {
    const onOpen = (e: Event) => {
      if ((e as CustomEvent).detail === "ai") {
        setOpen(false);
        setHiddenByOther(true);
      }
    };
    const onClose = (e: Event) => {
      if ((e as CustomEvent).detail === "ai") {
        setHiddenByOther(false);
      }
    };
    window.addEventListener("floating-widget-open", onOpen);
    window.addEventListener("floating-widget-close", onClose);
    return () => {
      window.removeEventListener("floating-widget-open", onOpen);
      window.removeEventListener("floating-widget-close", onClose);
    };
  }, []);

  function toggleOpen() {
    setOpen((prev) => {
      const next = !prev;
      if (next) {
        window.dispatchEvent(new CustomEvent("floating-widget-open", { detail: "team" }));
      } else {
        window.dispatchEvent(new CustomEvent("floating-widget-close", { detail: "team" }));
      }
      return next;
    });
  }

  function handleClose() {
    setOpen(false);
    window.dispatchEvent(new CustomEvent("floating-widget-close", { detail: "team" }));
  }

  // Kiểm tra quyền
  useEffect(() => {
    let alive = true;
    fetch("/api/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (alive && d?.canChat) {
          setCanChat(true);
          setCurrentUser(d.user ?? null);
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // Cuộn xuống tin nhắn mới nhất
  const scrollToBottom = () => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  };

  useEffect(() => {
    if (open) scrollToBottom();
  }, [messages, open]);

  // Tải tin nhắn ban đầu khi mở khung chat
  useEffect(() => {
    if (!open) return;
    let stop = false;
    setLoading(true);

    fetch("/api/team-chat?limit=30&read=1", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!stop && Array.isArray(d?.messages)) {
          setMessages(d.messages);
          for (const m of d.messages as ChatMessageDTO[]) {
            if (m.updatedAt > cursor.current) cursor.current = m.updatedAt;
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!stop) setLoading(false);
      });

    return () => {
      stop = true;
    };
  }, [open]);

  // Polling nhận tin nhắn mới mỗi 3s khi đang mở
  useEffect(() => {
    if (!open) return;
    const interval = setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch(`/api/team-chat?since=${encodeURIComponent(cursor.current)}&read=1`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data?.messages) && data.messages.length > 0) {
          setMessages((cur) => {
            const map = new Map(cur.map((m) => [m.id, m]));
            for (const m of data.messages as ChatMessageDTO[]) {
              map.set(m.id, m);
              if (m.updatedAt > cursor.current) cursor.current = m.updatedAt;
            }
            return [...map.values()].sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
          });
        }
      } catch {}
    }, 3000);

    return () => clearInterval(interval);
  }, [open]);

  // Gửi tin nhắn
  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content || sending) return;

    setSending(true);
    setText("");
    try {
      const res = await sendTeamMessageAction({ content });
      if (res.ok) {
        // Tải ngay tin mới
        const r = await fetch(`/api/team-chat?since=${encodeURIComponent(cursor.current)}&read=1`, {
          cache: "no-store",
        });
        const d = await r.json();
        if (Array.isArray(d?.messages)) {
          setMessages((cur) => {
            const map = new Map(cur.map((m) => [m.id, m]));
            for (const m of d.messages as ChatMessageDTO[]) {
              map.set(m.id, m);
              if (m.updatedAt > cursor.current) cursor.current = m.updatedAt;
            }
            return [...map.values()].sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
          });
        }
      }
    } catch {
    } finally {
      setSending(false);
    }
  }

  if (!canChat || hiddenByOther) return null;

  return (
    <div className={cn("no-print fixed right-4 flex flex-col items-end gap-2", open ? "bottom-4 z-50" : "bottom-20 z-40")}>
      {/* Khung chat popup */}
      {open && (
        <div
          role="dialog"
          aria-label="Kênh chat Ban Chấp Hành & Bí thư"
          className="flex h-[min(42rem,calc(100dvh-8rem))] w-[min(28rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-border bg-white shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center gap-2 bg-[#005ba6] px-3.5 py-2.5 text-white">
            <MessagesSquare className="size-4 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="truncate text-sm font-semibold">Kênh chat BCH & Bí thư</div>
              <div className="text-[10px] text-blue-100 opacity-90">Kênh nội bộ bảo mật</div>
            </div>
            <Link
              href="/team-chat"
              target="_blank"
              title="Mở toàn màn hình"
              className="rounded p-1 hover:bg-white/15"
            >
              <ExternalLink className="size-4" />
            </Link>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Đóng"
              className="rounded p-1 hover:bg-white/15"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Vùng tin nhắn */}
          <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-3 text-xs sm:text-sm">
            {loading && messages.length === 0 ? (
              <div className="flex h-full items-center justify-center text-muted">
                <Loader2 className="size-5 animate-spin mr-2" />
                <span>Đang tải tin nhắn...</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="rounded-lg bg-white p-4 text-center text-xs text-muted shadow-xs">
                Chưa có tin nhắn nào trong kênh. Hãy gửi lời chào đầu tiên!
              </div>
            ) : (
              messages.map((m) => {
                const isMe = m.authorId === currentUser?.id;
                return (
                  <div key={m.id} className={cn("flex gap-2", isMe && "flex-row-reverse")}>
                    {!isMe && (
                      <div className="mt-0.5 shrink-0">
                        <Avatar name={m.authorName} src={m.authorAvatar} size={28} />
                      </div>
                    )}
                    <div className={cn("max-w-[80%]", isMe && "text-right")}>
                      {!isMe && (
                        <div className="mb-0.5 flex items-center gap-1.5 text-[11px] text-slate-500">
                          <span className="font-semibold text-slate-700 truncate">{m.authorName}</span>
                          <span className="text-[10px] text-muted">({m.authorLabel})</span>
                        </div>
                      )}
                      <div
                        className={cn(
                          "rounded-2xl px-3 py-2 text-xs leading-relaxed shadow-xs whitespace-pre-wrap sm:text-sm",
                          isMe
                            ? "rounded-tr-sm bg-[#005ba6] text-white"
                            : "rounded-tl-sm bg-white text-slate-800"
                        )}
                      >
                        {m.deleted ? (
                          <span className="italic text-slate-400">Tin nhắn đã bị thu hồi</span>
                        ) : (
                          m.content
                        )}

                        {/* Tệp đính kèm */}
                        {m.attachments && m.attachments.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {m.attachments.map((att) => (
                              <div key={att.publicId} className="overflow-hidden rounded-md">
                                {att.kind === "image" ? (
                                  <a href={att.url} target="_blank" rel="noopener noreferrer">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={cdnImage(att.url, 400)}
                                      alt={att.name}
                                      className="max-h-40 rounded object-cover"
                                    />
                                  </a>
                                ) : (
                                  <a
                                    href={att.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block truncate rounded bg-black/10 px-2 py-1 text-[11px] hover:underline"
                                  >
                                    📎 {att.name}
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="mt-0.5 px-1 text-[10px] text-slate-400">
                        {new Date(m.createdAt).toLocaleTimeString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={endRef} />
          </div>

          {/* Ô nhập tin nhắn */}
          <form
            onSubmit={handleSend}
            className="flex items-center gap-2 border-t border-border bg-white p-2.5"
          >
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Nhập tin nhắn..."
              aria-label="Tin nhắn"
              maxLength={4000}
              className="h-9 min-w-0 flex-1 rounded-md border border-border px-3 text-sm focus:border-[#005ba6] focus:outline-none focus:ring-1 focus:ring-[#005ba6]"
            />
            <button
              type="submit"
              disabled={sending || !text.trim()}
              aria-label="Gửi"
              className="flex size-9 items-center justify-center rounded-md bg-[#005ba6] text-white hover:bg-[#004785] disabled:opacity-40"
            >
              {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </button>
          </form>
        </div>
      )}

      {/* Nút bấm kích hoạt mở/đóng */}
      <button
        type="button"
        onClick={toggleOpen}
        title={open ? "Đóng khung chat" : "Kênh chat Ban Chấp Hành & Bí thư"}
        aria-label={open ? "Đóng khung chat" : "Kênh chat Ban Chấp Hành và Bí thư"}
        className="group relative flex size-12 items-center justify-center rounded-full bg-[#005ba6] text-white shadow-lg transition-transform hover:scale-105 hover:bg-[#004785] active:scale-95"
      >
        {open ? (
          <X className="size-5" />
        ) : (
          <MessagesSquare className="size-6 transition-transform group-hover:scale-110" />
        )}
        {!open && (
          <span className="pointer-events-none absolute right-full mr-2 hidden whitespace-nowrap rounded-md bg-slate-900/90 px-2.5 py-1 text-xs font-medium text-white shadow-md sm:group-hover:block">
            Kênh chat BCH & Bí thư
          </span>
        )}
      </button>
    </div>
  );
}
