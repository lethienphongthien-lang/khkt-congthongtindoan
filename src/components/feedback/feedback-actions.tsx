"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { deleteFeedbackAction, updateFeedbackAction } from "@/actions/feedback";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/form";
import { ConfirmButton } from "@/components/ui/modal";
import { reportResult } from "@/components/ui/submit";
import { FEEDBACK_STATUS } from "./status";
import type { MessageKey } from "@/lib/i18n/translate";
import { useT } from "@/lib/i18n/client";

export function FeedbackActions({ id, status: initial, note: initialNote }: { id: string; status: keyof typeof FEEDBACK_STATUS; note: string }) {
  const t = useT();
  const router = useRouter();
  const [status, setStatus] = useState(initial);
  const [note, setNote] = useState(initialNote);
  const [busy, setBusy] = useState(false);
  return (
    <div className="max-w-xl space-y-4">
      <Field label={t("community.fa.status")}><Select value={status} onChange={(e) => setStatus(e.target.value as keyof typeof FEEDBACK_STATUS)}>{Object.entries(FEEDBACK_STATUS).map(([k, v]) => <option key={k} value={k}>{t(`community.fas.${k}` as MessageKey)}</option>)}</Select></Field>
      <Field label={t("community.fa.note")}><Textarea value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} /></Field>
      <div className="flex gap-2">
        <Button loading={busy} onClick={async () => { setBusy(true); reportResult(await updateFeedbackAction(id, { status, note })); setBusy(false); router.refresh(); }}>{t("community.save")}</Button>
        <ConfirmButton triggerVariant="secondary" triggerClassName="text-danger" trigger={<><Trash2 className="size-4" />{t("community.delete")}</>} title={t("community.fa.deleteTitle")} danger confirmLabel={t("community.delete")}
          onConfirm={async () => { reportResult(await deleteFeedbackAction(id)); router.push("/feedback"); }} />
      </div>
    </div>
  );
}
