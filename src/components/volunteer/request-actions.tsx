"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, CircleCheck, Pencil, X } from "lucide-react";
import { approveVolunteerAction, cancelVolunteerRequestAction, completeVolunteerAction, rejectVolunteerAction } from "@/actions/volunteer";
import { Button, buttonClass } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form";
import { ConfirmButton, Modal } from "@/components/ui/modal";
import { reportResult } from "@/components/ui/submit";
import { useT } from "@/lib/i18n/client";

/** Nút xử lý một đăng ký tình nguyện đang chờ duyệt: Admin duyệt hoặc từ chối (kèm lý do); bí thư rút lại đăng ký của mình. */
export function VolunteerRequestActions({ id, task, admin }: { id: string; task: string; admin: boolean }) {
  const t = useT();
  const router = useRouter();
  const [reject, setReject] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {admin && (
        <>
          <ConfirmButton triggerVariant="primary" trigger={<><Check className="size-4" /><span className="max-sm:hidden">{t("community.cr.approve")}</span></>} triggerLabel={t("community.cr.approve")} title={t("community.vr.approveTitle")}
            description={<>{t("community.vr.approveA")} <b>{task}</b> {t("community.vr.approveB")}</>} confirmLabel={t("community.cr.approve")}
            onConfirm={async () => { reportResult(await approveVolunteerAction(id)); router.refresh(); }} />
          <Button size="sm" variant="secondary" onClick={() => setReject(true)}><X className="size-4" /><span className="max-sm:hidden">{t("community.cr.reject")}</span></Button>
          <Modal open={reject} onClose={() => !busy && setReject(false)} title={t("community.vr.rejectTitle")} className="max-w-md">
            <p className="mb-2 text-sm text-muted">{t("community.vr.rejectHint")}</p>
            <Textarea className="min-h-20" maxLength={300} placeholder={t("community.vr.rejectPh")} value={reason} onChange={(e) => setReason(e.target.value)} />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setReject(false)} disabled={busy}>{t("community.cancel")}</Button>
              <Button variant="danger" loading={busy} onClick={async () => { setBusy(true); const res = await rejectVolunteerAction(id, reason); setBusy(false); if (reportResult(res)) { setReject(false); setReason(""); router.refresh(); } }}>{t("community.cr.reject")}</Button>
            </div>
          </Modal>
        </>
      )}
      <Link href={`/volunteer/${id}/edit`} className={buttonClass("ghost", "sm")}><Pencil className="size-4" /><span className="max-sm:hidden">{t("community.edit")}</span></Link>
      <ConfirmButton triggerVariant="ghost" triggerClassName="text-danger" trigger={t("community.vr.withdraw")} title={t("community.vr.withdrawTitle")} danger confirmLabel={t("community.vr.withdraw")} description={t("community.vr.withdrawDesc", { task })}
        onConfirm={async () => { reportResult(await cancelVolunteerRequestAction(id)); router.refresh(); }} />
    </div>
  );
}

/** Buổi đã được duyệt: bí thư bấm Hoàn thành để tự động cộng điểm cho cả Chi đoàn, hoặc hủy buổi nếu không làm nữa. */
export function VolunteerApprovedActions({ id, task, points }: { id: string; task: string; points: number }) {
  const t = useT();
  const router = useRouter();
  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      <ConfirmButton triggerVariant="primary" trigger={<><CircleCheck className="size-4" />{t("community.vr.complete")}</>} title={t("community.vr.completeTitle")} confirmLabel={t("community.vr.complete")}
        description={<>{t("community.vr.completeA")} <b>{t("community.vr.completeB", { n: points })}</b> {t("community.vr.completeC")} <b>{task}</b>. {t("community.vr.completeD")}</>}
        onConfirm={async () => { reportResult(await completeVolunteerAction(id)); router.refresh(); }} />
      <Link href={`/volunteer/${id}/edit`} className={buttonClass("ghost", "sm")}><Pencil className="size-4" /><span className="max-sm:hidden">{t("community.edit")}</span></Link>
      <ConfirmButton triggerVariant="ghost" triggerClassName="text-danger" trigger={t("community.vr.cancelSession")} title={t("community.vr.cancelTitle")} danger confirmLabel={t("community.vr.cancelSession")} description={t("community.vr.cancelDesc", { task })}
        onConfirm={async () => { reportResult(await cancelVolunteerRequestAction(id)); router.refresh(); }} />
    </div>
  );
}
