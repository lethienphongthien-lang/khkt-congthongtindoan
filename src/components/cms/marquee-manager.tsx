"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { addMarqueeAction, deleteMarqueeAction, moveMarqueeAction, toggleMarqueeAction } from "@/actions/cms";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { ConfirmButton } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/misc";
import { reportResult } from "@/components/ui/submit";
import { cn } from "@/utils";

type Item = { id: string; text: string; link: string | null; active: boolean };

export function MarqueeManager({ items }: { items: Item[] }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<unknown>) => start(async () => { await fn(); router.refresh(); });

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-white/85 p-4">
        <h2 className="mb-3 text-[15px] font-semibold">Thêm dòng chữ chạy</h2>
        <div className="grid gap-3 md:grid-cols-[1fr_16rem_auto] md:items-end">
          <Field label="Nội dung" required><Input value={text} onChange={(e) => setText(e.target.value)} maxLength={300} placeholder="Ví dụ: Thông báo lịch sinh hoạt Chi đoàn tháng 10" /></Field>
          <Field label="Liên kết (tùy chọn)"><Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="/thong-bao hoặc https://..." /></Field>
          <Button loading={busy} disabled={text.trim().length < 2} onClick={async () => {
            setBusy(true); const res = await addMarqueeAction({ text, link }); setBusy(false);
            if (reportResult(res)) { setText(""); setLink(""); router.refresh(); }
          }}><Plus className="size-4" />Thêm</Button>
        </div>
        <p className="mt-2 text-xs text-muted">Các dòng đang bật chạy lần lượt từ trái sang phải ở đầu trang công khai. Nếu không có dòng nào, hệ thống hiển thị câu chào mặc định.</p>
      </div>

      <div className="rounded-lg border border-border bg-white/85">
        {items.length === 0 ? <EmptyState title="Chưa có dòng chữ chạy" description="Đang hiển thị câu chào mặc định. Thêm dòng đầu tiên ở phía trên." /> : (
          <ul className="divide-y divide-border">
            {items.map((it, i) => (
              <li key={it.id} className={cn("flex items-center gap-3 px-4 py-3", !it.active && "opacity-60")}>
                <div className="flex shrink-0 flex-col">
                  <button disabled={i === 0 || pending} onClick={() => run(() => moveMarqueeAction(it.id, "up"))} className="rounded p-0.5 text-muted hover:bg-slate-100 disabled:opacity-30" aria-label="Lên"><ArrowUp className="size-4" /></button>
                  <button disabled={i === items.length - 1 || pending} onClick={() => run(() => moveMarqueeAction(it.id, "down"))} className="rounded p-0.5 text-muted hover:bg-slate-100 disabled:opacity-30" aria-label="Xuống"><ArrowDown className="size-4" /></button>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium break-words">{it.text}</div>
                  {it.link && <div className="truncate text-xs text-primary">{it.link}</div>}
                </div>
                <label className="flex shrink-0 cursor-pointer items-center gap-2 text-[13px]">
                  <input type="checkbox" className="size-4 accent-primary" checked={it.active} disabled={pending} onChange={(e) => run(async () => reportResult(await toggleMarqueeAction(it.id, e.target.checked)))} />
                  <span className="max-sm:hidden">{it.active ? "Đang bật" : "Đã tắt"}</span>
                </label>
                <ConfirmButton triggerVariant="ghost" triggerClassName="text-danger" triggerLabel="Xóa" trigger={<Trash2 className="size-3.5" />} title="Xóa dòng chữ chạy?" danger confirmLabel="Xóa"
                  description={it.text} onConfirm={async () => { reportResult(await deleteMarqueeAction(it.id)); router.refresh(); }} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
