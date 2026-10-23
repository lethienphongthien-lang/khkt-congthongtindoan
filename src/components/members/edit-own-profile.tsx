"use client";
import { MIN_BIRTH, nameOnly, todayVN } from "@/lib/validation/rules";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { firstError, ownProfileSchema } from "@/lib/validation";
import { Pencil } from "lucide-react";
import { updateOwnProfileAction } from "@/actions/members";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { reportResult } from "@/components/ui/submit";

/** Đoàn viên tự sửa thông tin cá nhân (không gồm lớp, Chi đoàn, khóa: do Admin quản lý). */
export function EditOwnProfileButton({ initial, doanVien = true }: { initial: { fullName: string; gender: string; dateOfBirth: string; joinedAt: string }; doanVien?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [v, setV] = useState(initial);
  const [busy, setBusy] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => { setV(initial); setOpen(true); }}><Pencil className="size-3.5" />Sửa thông tin</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Sửa thông tin cá nhân" className="max-w-md">
        <div className="space-y-3">
          <Field label="Họ và tên" required><Input value={v.fullName} maxLength={100} onChange={(e) => setV({ ...v, fullName: nameOnly(e.target.value) })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ngày sinh"><Input type="date" min={MIN_BIRTH} max={today} value={v.dateOfBirth} onChange={(e) => setV({ ...v, dateOfBirth: e.target.value })} /></Field>
            <Field label="Giới tính">
              <Select value={v.gender} onChange={(e) => setV({ ...v, gender: e.target.value })}><option value="">—</option><option>Nam</option><option>Nữ</option><option>Khác</option></Select>
            </Field>
          </div>
          {doanVien && <Field label="Ngày vào Đoàn"><Input type="date" min="1990-01-01" max={today} value={v.joinedAt} onChange={(e) => setV({ ...v, joinedAt: e.target.value })} /></Field>}
          <p className="text-xs text-muted">Lớp, Chi đoàn, khóa và điểm do Ban chấp hành quản lý, bạn không tự đổi được. Cần đổi các mục này hãy liên hệ Admin.</p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>Hủy</Button>
            <Button loading={busy} disabled={v.fullName.trim().length < 2} onClick={async () => {
              const err = firstError(ownProfileSchema, v); if (err) return void toast.error(err);
              setBusy(true); const res = await updateOwnProfileAction(v); setBusy(false);
              if (reportResult(res)) { setOpen(false); router.refresh(); }
            }}>Lưu</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
