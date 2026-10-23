"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, CircleCheck, X } from "lucide-react";
import { approveVolunteerAction, cancelVolunteerRequestAction, completeVolunteerAction, rejectVolunteerAction } from "@/actions/volunteer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form";
import { ConfirmButton, Modal } from "@/components/ui/modal";
import { reportResult } from "@/components/ui/submit";

/** Nút xử lý một đăng ký tình nguyện đang chờ duyệt: Admin duyệt hoặc từ chối (kèm lý do); bí thư rút lại đăng ký của mình. */
export function VolunteerRequestActions({ id, task, admin }: { id: string; task: string; admin: boolean }) {
  const router = useRouter();
  const [reject, setReject] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {admin && (
        <>
          <ConfirmButton triggerVariant="primary" trigger={<><Check className="size-4" /><span className="max-sm:hidden">Duyệt</span></>} triggerLabel="Duyệt" title="Duyệt đăng ký tình nguyện?"
            description={<>Buổi <b>{task}</b> sẽ hiện trên lịch tình nguyện và các đoàn viên của Chi đoàn nhận thông báo. Sau buổi làm việc, bí thư bấm Hoàn thành để cộng điểm.</>} confirmLabel="Duyệt"
            onConfirm={async () => { reportResult(await approveVolunteerAction(id)); router.refresh(); }} />
          <Button size="sm" variant="secondary" onClick={() => setReject(true)}><X className="size-4" /><span className="max-sm:hidden">Từ chối</span></Button>
          <Modal open={reject} onClose={() => !busy && setReject(false)} title="Từ chối đăng ký tình nguyện" className="max-w-md">
            <p className="mb-2 text-sm text-muted">Bí thư sẽ nhận thông báo kèm lý do (không bắt buộc).</p>
            <Textarea className="min-h-20" maxLength={300} placeholder="Ví dụ: Trùng lịch với hoạt động khác, mời đăng ký ngày khác." value={reason} onChange={(e) => setReason(e.target.value)} />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setReject(false)} disabled={busy}>Hủy</Button>
              <Button variant="danger" loading={busy} onClick={async () => { setBusy(true); const res = await rejectVolunteerAction(id, reason); setBusy(false); if (reportResult(res)) { setReject(false); setReason(""); router.refresh(); } }}>Từ chối</Button>
            </div>
          </Modal>
        </>
      )}
      <ConfirmButton triggerVariant="ghost" triggerClassName="text-danger" trigger="Rút đăng ký" title="Rút đăng ký này?" danger confirmLabel="Rút đăng ký" description={`Đăng ký "${task}" sẽ bị xóa.`}
        onConfirm={async () => { reportResult(await cancelVolunteerRequestAction(id)); router.refresh(); }} />
    </div>
  );
}

/** Buổi đã được duyệt: bí thư bấm Hoàn thành để tự động cộng điểm cho cả Chi đoàn, hoặc hủy buổi nếu không làm nữa. */
export function VolunteerApprovedActions({ id, task, points }: { id: string; task: string; points: number }) {
  const router = useRouter();
  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      <ConfirmButton triggerVariant="primary" trigger={<><CircleCheck className="size-4" />Hoàn thành</>} title="Xác nhận buổi tình nguyện đã hoàn thành?" confirmLabel="Hoàn thành"
        description={<>Mỗi đoàn viên của Chi đoàn sẽ được cộng <b>{points} điểm</b> cho buổi <b>{task}</b>. Chỉ làm được một lần.</>}
        onConfirm={async () => { reportResult(await completeVolunteerAction(id)); router.refresh(); }} />
      <ConfirmButton triggerVariant="ghost" triggerClassName="text-danger" trigger="Hủy buổi" title="Hủy buổi tình nguyện này?" danger confirmLabel="Hủy buổi" description={`Buổi "${task}" sẽ bị xóa và không cộng điểm.`}
        onConfirm={async () => { reportResult(await cancelVolunteerRequestAction(id)); router.refresh(); }} />
    </div>
  );
}
