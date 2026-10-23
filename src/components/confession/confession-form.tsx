"use client";
import { useState } from "react";
import { toast } from "sonner";
import { submitConfessionAction } from "@/actions/confessions";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form";

export function ConfessionForm({ onDone }: { onDone?: () => void } = {}) {
  const [v, setV] = useState({ content: "", nickname: "", website: "" });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string>();
  if (done) {
    return (
      <div className="rounded-lg border border-border bg-white/85 p-6 text-center">
        <p className="font-semibold text-primary-dark">Đã gửi confession!</p>
        <p className="mt-1 text-sm text-muted">Confession sẽ hiện công khai sau khi Ban chấp hành Đoàn trường duyệt.</p>
        <div className="mt-4 flex justify-center gap-2">
          <Button variant="secondary" onClick={() => { setV({ content: "", nickname: "", website: "" }); setDone(false); }}>Gửi confession khác</Button>
          {onDone && <Button onClick={onDone}>Đóng</Button>}
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-4 rounded-lg border border-border bg-white/85 p-4 sm:p-6">
      <Field label="Nội dung confession" required error={error} hint="Ẩn danh, không cần đăng nhập. Giữ lời lẽ văn minh, không nêu tên hay xúc phạm người khác.">
        <Textarea className="min-h-40" maxLength={1500} value={v.content} onChange={(e) => setV({ ...v, content: e.target.value })} />
        <div className="text-right text-xs text-muted">{v.content.length}/1500</div>
      </Field>
      <Field label="Biệt danh (không bắt buộc)"><Input maxLength={40} value={v.nickname} onChange={(e) => setV({ ...v, nickname: e.target.value })} /></Field>
      <input tabIndex={-1} autoComplete="off" aria-hidden className="hidden" value={v.website} onChange={(e) => setV({ ...v, website: e.target.value })} />
      <Button loading={busy} onClick={async () => {
        if (v.content.trim().length < 10) { setError("Nội dung quá ngắn (tối thiểu 10 ký tự)"); return void toast.error("Nội dung quá ngắn (tối thiểu 10 ký tự)"); }
        setBusy(true); setError(undefined);
        const res = await submitConfessionAction(v);
        setBusy(false);
        if (!res.ok) { setError(res.fieldErrors?.content?.[0]); return void toast.error(res.error); }
        setDone(true);
      }}>Gửi confession</Button>
    </div>
  );
}
