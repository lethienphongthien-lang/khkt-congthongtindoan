"use client";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { submitFeedbackAction } from "@/actions/feedback";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";

const CATEGORIES = ["Hoạt động Đoàn", "Học tập", "Cơ sở vật chất", "Đề xuất ý tưởng", "Khác"];

export function FeedbackForm() {
  const [v, setV] = useState({ category: CATEGORIES[0], content: "", contact: "", website: "" });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string>();

  if (done) {
    return (
      <div className="rounded-lg border border-primary/20 bg-white/85 p-8 text-center">
        <CheckCircle2 className="mx-auto size-12 text-primary" />
        <h2 className="mt-3 text-lg font-bold">Cảm ơn bạn đã góp ý!</h2>
        <p className="mt-1 text-sm text-muted">Ý kiến của bạn đã được gửi ẩn danh tới Đoàn trường.</p>
        <Button className="mt-4" variant="secondary" onClick={() => { setDone(false); setV({ ...v, content: "", contact: "" }); }}>Gửi góp ý khác</Button>
      </div>
    );
  }
  return (
    <div className="w-full space-y-4 rounded-lg border border-border bg-white/85 p-4 sm:p-6">
      <Field label="Chủ đề"><Select value={v.category} onChange={(e) => setV({ ...v, category: e.target.value })}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select></Field>
      <Field label="Nội dung góp ý" required error={error} hint="Không cần đăng nhập, không lưu họ tên của bạn."><Textarea className="min-h-40" maxLength={2000} value={v.content} onChange={(e) => setV({ ...v, content: e.target.value })} /></Field>
      <Field label="Cách liên hệ (không bắt buộc)" hint="Chỉ điền nếu bạn muốn Đoàn trường phản hồi lại."><Input maxLength={120} inputMode="email" placeholder="Số điện thoại (0912345678) hoặc email" value={v.contact} onChange={(e) => setV({ ...v, contact: e.target.value })} /></Field>
      {/* Ô bẫy bot: người dùng thật không thấy */}
      <input tabIndex={-1} autoComplete="off" aria-hidden className="hidden" value={v.website} onChange={(e) => setV({ ...v, website: e.target.value })} />
      <Button loading={busy} onClick={async () => {
        setBusy(true); setError(undefined);
        const res = await submitFeedbackAction(v);
        setBusy(false);
        if (!res.ok) { setError(res.fieldErrors?.content?.[0]); return void toast.error(res.error); }
        setDone(true);
      }}>Gửi góp ý</Button>
    </div>
  );
}
