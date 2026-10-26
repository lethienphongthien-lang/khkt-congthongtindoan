"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MessageCircle, Send, Sparkles, X } from "lucide-react";
import { chatAskAction, type ChatSource } from "@/actions/chat";
import { cn } from "@/utils";

type Msg = { role: "user" | "bot"; text: string; sources?: ChatSource[]; error?: boolean };
const SUGGEST = ["Sắp tới có hoạt động gì?", "Cách tham gia trò chơi tích điểm?", "Làm sao để gửi góp ý cho Đoàn trường?"];

/** Chatbot hỏi đáp nổi ở góc dưới trang công khai. Chỉ trả lời từ nội dung công khai của website. */
export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [hiddenByOther, setHiddenByOther] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [msgs, busy, open]);

  // Đồng bộ đóng/ẩn khi khung chat khác (Kênh BCH & Bí thư) đang mở để không đè lên nhau
  useEffect(() => {
    const onOpen = (e: Event) => {
      if ((e as CustomEvent).detail === "team") {
        setOpen(false);
        setHiddenByOther(true);
      }
    };
    const onClose = (e: Event) => {
      if ((e as CustomEvent).detail === "team") {
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
        window.dispatchEvent(new CustomEvent("floating-widget-open", { detail: "ai" }));
      } else {
        window.dispatchEvent(new CustomEvent("floating-widget-close", { detail: "ai" }));
      }
      return next;
    });
  }

  function handleClose() {
    setOpen(false);
    window.dispatchEvent(new CustomEvent("floating-widget-close", { detail: "ai" }));
  }

  async function ask(text: string) {
    const question = text.trim();
    if (!question || busy) return;
    const history = msgs.filter((m) => !m.error).slice(-4).map((m) => ({ role: m.role, text: m.text.slice(0, 600) }));
    setMsgs((m) => [...m, { role: "user", text: question }]); setQ(""); setBusy(true);
    try {
      const r = await chatAskAction({ question, history });
      setMsgs((m) => [...m, r.ok && r.data ? { role: "bot", text: r.data.answer, sources: r.data.sources } : { role: "bot", text: r.ok ? "Mình chưa trả lời được lúc này." : r.error, error: true }]);
    } catch { setMsgs((m) => [...m, { role: "bot", text: "Mất kết nối, bạn thử lại nhé.", error: true }]); }
    finally { setBusy(false); }
  }

  if (hiddenByOther) return null;

  return (
    <div className={cn("no-print fixed right-4 z-40 flex flex-col items-end gap-2", open ? "bottom-4 z-50" : "bottom-4")}>
      {open && (
        <div role="dialog" aria-label="Trợ lý AI Đoàn trường" className="flex h-[min(44rem,calc(100dvh-6rem))] w-[min(30rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-border bg-white shadow-2xl">
          <div className="flex items-center gap-2 bg-primary px-3 py-2.5 text-white">
            <Sparkles className="size-4" /><div className="flex-1 text-sm font-semibold">Trợ lý Đoàn trường <span className="ml-1 rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-bold tracking-wide">AI</span></div>
            <button type="button" onClick={handleClose} aria-label="Đóng" className="rounded p-1 hover:bg-white/15"><X className="size-4" /></button>
          </div>
          <div className="flex-1 space-y-2.5 overflow-y-auto bg-slate-50 p-3 text-sm">
            <div className="max-w-[88%] rounded-2xl rounded-tl-sm bg-white px-3 py-2 shadow-sm">Xin chào! Mình là trợ lý AI của Đoàn trường THPT Sơn Hà. Bạn cứ hỏi về hoạt động, sự kiện, kế hoạch… Mình chỉ trả lời theo nội dung đã đăng trên website.</div>
            {msgs.length === 0 && <div className="flex flex-wrap gap-1.5">{SUGGEST.map((s) => <button key={s} type="button" onClick={() => ask(s)} className="rounded-full border border-primary/30 bg-white px-2.5 py-1 text-xs text-primary hover:bg-primary-light">{s}</button>)}</div>}
            {msgs.map((m, i) => (
              <div key={i} className={cn("flex", m.role === "user" && "justify-end")}>
                <div className={cn("max-w-[88%] whitespace-pre-wrap rounded-2xl px-3 py-2 shadow-sm", m.role === "user" ? "rounded-tr-sm bg-primary text-white" : m.error ? "rounded-tl-sm bg-red-50 text-red-700" : "rounded-tl-sm bg-white")}>
                  {m.text}
                  {m.sources && m.sources.length > 0 && (
                    <div className="mt-2 space-y-0.5 border-t border-border pt-1.5 text-xs">
                      <div className="text-muted">Xem thêm:</div>
                      {m.sources.map((s) => <Link key={s.href} href={s.href} className="block truncate text-primary hover:underline">{s.title}</Link>)}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {busy && <div className="w-fit rounded-2xl rounded-tl-sm bg-white px-3 py-2 text-muted shadow-sm">Đang tìm câu trả lời<span className="ai-dots" aria-hidden><i>.</i><i>.</i><i>.</i></span></div>}
            <div ref={end} />
          </div>
          <form onSubmit={(e) => { e.preventDefault(); ask(q); }} className="flex items-center gap-2 border-t border-border bg-white p-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} maxLength={300} placeholder="Nhập câu hỏi…" aria-label="Câu hỏi" className="h-9 min-w-0 flex-1 rounded-md border border-border px-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
            <button type="submit" disabled={busy || q.trim().length < 2} aria-label="Gửi" className="flex size-9 items-center justify-center rounded-md bg-primary text-white disabled:opacity-40"><Send className="size-4" /></button>
          </form>
          <div className="bg-white px-3 pb-1.5 text-center text-[11px] text-muted">Do AI trả lời, có thể chưa chính xác. Hãy kiểm tra lại với Đoàn trường.</div>
        </div>
      )}
      <button type="button" onClick={toggleOpen} aria-label={open ? "Đóng trợ lý" : "Hỏi trợ lý AI Đoàn trường"} className="flex size-12 items-center justify-center rounded-full bg-primary text-white shadow-lg hover:bg-primary-dark">
        {open ? <X className="size-5" /> : <MessageCircle className="size-6" />}
      </button>
    </div>
  );
}
