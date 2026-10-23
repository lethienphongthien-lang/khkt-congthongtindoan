"use client";
import { todayVN } from "@/lib/validation/rules";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { KeyRound, Lock, LockOpen, Pencil, PlusCircle, Trash2, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { adjustPointsAction, admitMemberAction, deleteMemberAction, resetMemberPasswordAction, setMemberAccountStatusAction } from "@/actions/members";
import { Button, buttonClass } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { ConfirmButton, Modal } from "@/components/ui/modal";
import { Alert } from "@/components/ui/misc";
import { reportResult } from "@/components/ui/submit";
import { downloadAccounts } from "@/components/members/credentials";

export function MemberAdminActions({ id, locked, isAdmin, code, fullName, doanVien = true }: { id: string; locked: boolean; isAdmin: boolean; code: string; fullName: string; doanVien?: boolean }) {
  const router = useRouter();
  const [pw, setPw] = useState<string | null>(null);
  const [adjust, setAdjust] = useState(false);
  const [points, setPoints] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [admit, setAdmit] = useState(false);
  const [joined, setJoined] = useState(new Date().toISOString().slice(0, 10));

  return (
    <>
      {isAdmin && <Link href={`/members/${id}/edit`} aria-label="Sửa" className={buttonClass("secondary", "sm")}><Pencil className="size-3.5" /><span className="max-sm:hidden">Sửa</span></Link>}
      <ConfirmButton triggerLabel="Cấp lại mật khẩu" trigger={<><KeyRound className="size-3.5" /><span className="max-sm:hidden">Cấp lại mật khẩu</span></>} title="Cấp lại mật khẩu tạm thời?"
        description="Mật khẩu cũ sẽ không còn dùng được. Đoàn viên phải đổi mật khẩu ở lần đăng nhập kế tiếp."
        onConfirm={async () => { const res = await resetMemberPasswordAction(id); if (reportResult(res)) { setPw(res.ok ? res.data!.password : null); if (res.ok) downloadAccounts([{ username: code, fullName, detail: "Cấp lại mật khẩu", password: res.data!.password }], `mat-khau-${code}.csv`, "Ghi chú"); } }} />
      {isAdmin && !doanVien && <Button size="sm" onClick={() => setAdmit(true)}><UserCheck className="size-3.5" /><span className="max-sm:hidden">Kết nạp vào Đoàn</span></Button>}
      {isAdmin && (
        <>
          <Button variant="secondary" size="sm" aria-label="Điều chỉnh điểm" title="Điều chỉnh điểm" onClick={() => setAdjust(true)}><PlusCircle className="size-3.5" /><span className="max-sm:hidden">Điều chỉnh điểm</span></Button>
          <ConfirmButton triggerLabel={locked ? "Kích hoạt tài khoản" : "Khóa tài khoản"} trigger={locked ? <><LockOpen className="size-3.5" /><span className="max-sm:hidden">Kích hoạt</span></> : <><Lock className="size-3.5" /><span className="max-sm:hidden">Khóa tài khoản</span></>}
            title={locked ? "Kích hoạt lại tài khoản?" : "Khóa tài khoản?"}
            description={locked ? "Đoàn viên có thể đăng nhập trở lại." : "Đoàn viên sẽ không thể đăng nhập cho đến khi được kích hoạt lại."}
            danger={!locked} confirmLabel={locked ? "Kích hoạt" : "Khóa"}
            onConfirm={async () => { reportResult(await setMemberAccountStatusAction(id, locked ? "ACTIVE" : "LOCKED")); router.refresh(); }} />
          <ConfirmButton triggerLabel="Xóa đoàn viên" trigger={<><Trash2 className="size-3.5" /><span className="max-sm:hidden">Xóa</span></>} triggerClassName="text-danger" title="Xóa đoàn viên?" danger confirmLabel="Xóa vĩnh viễn"
            description="Toàn bộ hồ sơ, tài khoản, lịch sử điểm danh và điểm của đoàn viên này sẽ bị xóa và không thể khôi phục."
            onConfirm={async () => { if (reportResult(await deleteMemberAction(id))) { router.push("/members"); router.refresh(); } }} />
        </>
      )}

      <Modal open={admit} onClose={() => setAdmit(false)} title="Kết nạp vào Đoàn" className="max-w-sm">
        <div className="space-y-3">
          <p className="text-sm text-slate-600">Kết nạp <b>{fullName}</b> vào Đoàn TNCS Hồ Chí Minh. Từ nay bạn này là <b>đoàn viên</b> và nhận thông báo chúc mừng.</p>
          <Field label="Ngày vào Đoàn"><Input type="date" min="1990-01-01" max={todayVN()} value={joined} onChange={(e) => setJoined(e.target.value)} /></Field>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setAdmit(false)}>Hủy</Button>
            <Button loading={busy} onClick={async () => { setBusy(true); const res = await admitMemberAction(id, joined); setBusy(false); if (reportResult(res)) { setAdmit(false); router.refresh(); } }}>Kết nạp</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!pw} onClose={() => setPw(null)} title="Mật khẩu tạm thời" className="max-w-sm">
        <Alert tone="green">Chỉ hiển thị một lần. Hãy gửi cho đoàn viên.</Alert>
        <p className="my-4 text-center font-mono text-xl tracking-wider select-all">{pw}</p>
        <div className="flex justify-end"><Button onClick={() => setPw(null)}>Đóng</Button></div>
      </Modal>

      <Modal open={adjust} onClose={() => setAdjust(false)} title="Điều chỉnh điểm hoạt động" className="max-w-sm">
        <div className="space-y-3">
          <Field label="Số điểm (+ cộng, − trừ)"><Input type="number" value={points} onChange={(e) => setPoints(e.target.value)} placeholder="Ví dụ: 5 hoặc -3" /></Field>
          <Field label="Lý do"><Input value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setAdjust(false)}>Hủy</Button>
            <Button loading={busy} onClick={async () => {
              setBusy(true);
              const res = await adjustPointsAction({ memberId: id, points, reason });
              setBusy(false);
              if (reportResult(res)) { setAdjust(false); setPoints(""); setReason(""); router.refresh(); }
            }}>Lưu</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
