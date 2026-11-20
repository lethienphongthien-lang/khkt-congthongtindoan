"use client";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { submitFeedbackAction } from "@/actions/feedback";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { useT } from "@/lib/i18n/client";

// Giá trị lưu vào CSDL giữ nguyên tiếng Việt; chỉ nhãn hiển thị được dịch.
const CATEGORIES = ["Hoạt động Đoàn", "Học tập", "Cơ sở vật chất", "Đề xuất ý tưởng", "Khác"] as const;
const CATEGORY_KEYS = ["community.fbc.0", "community.fbc.1", "community.fbc.2", "community.fbc.3", "community.fbc.4"] as const;

export function FeedbackForm() {
  const t = useT();
  const [v, setV] = useState({ category: CATEGORIES[0] as string, content: "", contact: "", website: "" });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string>();

  if (done) {
    return (
      <div className="rounded-lg border border-primary/20 bg-white/85 p-8 text-center">
        <CheckCircle2 className="mx-auto size-12 text-primary" />
        <h2 className="mt-3 text-lg font-bold">{t("community.ff.thanks")}</h2>
        <p className="mt-1 text-sm text-muted">{t("community.ff.thanksDesc")}</p>
        <Button className="mt-4" variant="secondary" onClick={() => { setDone(false); setV({ ...v, content: "", contact: "" }); }}>{t("community.ff.another")}</Button>
      </div>
    );
  }
  return (
    <div className="w-full space-y-4 rounded-lg border border-border bg-white/85 p-4 sm:p-6">
      <Field label={t("community.ff.topic")}><Select value={v.category} onChange={(e) => setV({ ...v, category: e.target.value })}>{CATEGORIES.map((c, i) => <option key={c} value={c}>{t(CATEGORY_KEYS[i])}</option>)}</Select></Field>
      <Field label={t("community.ff.content")} required error={error} hint={t("community.ff.contentHint")}><Textarea className="min-h-40" maxLength={2000} value={v.content} onChange={(e) => setV({ ...v, content: e.target.value })} /></Field>
      <Field label={`${t("community.ff.contact")} (${t("community.optional")})`} hint={t("community.ff.contactHint")}><Input maxLength={120} inputMode="email" placeholder={t("community.ff.contactPh")} value={v.contact} onChange={(e) => setV({ ...v, contact: e.target.value })} /></Field>
      {/* Ô bẫy bot: người dùng thật không thấy */}
      <input tabIndex={-1} autoComplete="off" aria-hidden className="hidden" value={v.website} onChange={(e) => setV({ ...v, website: e.target.value })} />
      <Button loading={busy} onClick={async () => {
        setBusy(true); setError(undefined);
        const res = await submitFeedbackAction(v);
        setBusy(false);
        if (!res.ok) { setError(res.fieldErrors?.content?.[0]); return void toast.error(res.error); }
        setDone(true);
      }}>{t("community.ff.submit")}</Button>
    </div>
  );
}
