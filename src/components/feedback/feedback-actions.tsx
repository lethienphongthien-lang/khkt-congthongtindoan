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

export function FeedbackActions({ id, status: initial, note: initialNote }: { id: string; status: keyof typeof FEEDBACK_STATUS; note: string }) {
  const router = useRouter();
  const [status, setStatus] = useState(initial);
  const [note, setNote] = useState(initialNote);
  const [busy, setBusy] = useState(false);
  return (
    <div className="max-w-xl space-y-4">
      <Field label="Trạng thái"><Select value={status} onChange={(e) => setStatus(e.target.value as keyof typeof FEEDBACK_STATUS)}>{Object.entries(FEEDBACK_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</Select></Field>
      <Field label="Ghi chú xử lý (chỉ Admin thấy)"><Textarea value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} /></Field>
      <div className="flex gap-2">
        <Button loading={busy} onClick={async () => { setBusy(true); reportResult(await updateFeedbackAction(id, { status, note })); setBusy(false); router.refresh(); }}>Lưu</Button>
        <ConfirmButton triggerVariant="secondary" triggerClassName="text-danger" trigger={<><Trash2 className="size-4" />Xóa</>} title="Xóa góp ý này?" danger confirmLabel="Xóa"
          onConfirm={async () => { reportResult(await deleteFeedbackAction(id)); router.push("/feedback"); }} />
      </div>
    </div>
  );
}
