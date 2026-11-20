"use client";
import { useState } from "react";
import { toast } from "sonner";
import { submitConfessionAction } from "@/actions/confessions";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form";
import { useT } from "@/lib/i18n/client";

export function ConfessionForm({ onDone }: { onDone?: () => void } = {}) {
  const t = useT();
  const [v, setV] = useState({ content: "", nickname: "", website: "" });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string>();
  if (done) {
    return (
      <div className="rounded-lg border border-border bg-white/85 p-6 text-center">
        <p className="font-semibold text-primary-dark">{t("community.cf2.sent")}</p>
        <p className="mt-1 text-sm text-muted">{t("community.cf2.sentDesc")}</p>
        <div className="mt-4 flex justify-center gap-2">
          <Button variant="secondary" onClick={() => { setV({ content: "", nickname: "", website: "" }); setDone(false); }}>{t("community.cf2.another")}</Button>
          {onDone && <Button onClick={onDone}>{t("community.close")}</Button>}
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-4 rounded-lg border border-border bg-white/85 p-4 sm:p-6">
      <Field label={t("community.cf2.content")} required error={error} hint={t("community.cf2.hint")}>
        <Textarea className="min-h-40" maxLength={1500} value={v.content} onChange={(e) => setV({ ...v, content: e.target.value })} />
        <div className="text-right text-xs text-muted">{v.content.length}/1500</div>
      </Field>
      <Field label={`${t("community.cf2.nick")} (${t("community.optional")})`}><Input maxLength={40} value={v.nickname} onChange={(e) => setV({ ...v, nickname: e.target.value })} /></Field>
      <input tabIndex={-1} autoComplete="off" aria-hidden className="hidden" value={v.website} onChange={(e) => setV({ ...v, website: e.target.value })} />
      <Button loading={busy} onClick={async () => {
        if (v.content.trim().length < 10) { setError(t("community.cf2.tooShort")); return void toast.error(t("community.cf2.tooShort")); }
        setBusy(true); setError(undefined);
        const res = await submitConfessionAction(v);
        setBusy(false);
        if (!res.ok) { setError(res.fieldErrors?.content?.[0]); return void toast.error(res.error); }
        setDone(true);
      }}>{t("community.cf2.submit")}</Button>
    </div>
  );
}
