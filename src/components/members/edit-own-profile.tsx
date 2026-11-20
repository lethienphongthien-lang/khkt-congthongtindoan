"use client";
import { MIN_BIRTH, nameOnly, todayVN } from "@/lib/validation/rules";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { firstError, ownProfileSchema } from "@/lib/validation";
import { Pencil } from "lucide-react";
import { updateOwnProfileAction } from "@/actions/members";
import { useT } from "@/lib/i18n/client";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { reportResult } from "@/components/ui/submit";

/** Đoàn viên tự sửa thông tin cá nhân (không gồm lớp, Chi đoàn, khóa: do Admin quản lý). */
export function EditOwnProfileButton({ initial, doanVien = true }: { initial: { fullName: string; gender: string; dateOfBirth: string; joinedAt: string }; doanVien?: boolean }) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [v, setV] = useState(initial);
  const [busy, setBusy] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => { setV(initial); setOpen(true); }}><Pencil className="size-3.5" />{t("members.editInfo")}</Button>
      <Modal open={open} onClose={() => setOpen(false)} title={t("members.editPersonal")} className="max-w-md">
        <div className="space-y-3">
          <Field label={t("members.fullName")} required><Input value={v.fullName} maxLength={100} onChange={(e) => setV({ ...v, fullName: nameOnly(e.target.value) })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("members.dob")}><Input type="date" min={MIN_BIRTH} max={today} value={v.dateOfBirth} onChange={(e) => setV({ ...v, dateOfBirth: e.target.value })} /></Field>
            <Field label={t("members.gender")}>
              <Select value={v.gender} onChange={(e) => setV({ ...v, gender: e.target.value })}><option value="">—</option><option value="Nam">{t("members.male")}</option><option value="Nữ">{t("members.female")}</option><option value="Khác">{t("vio.type.other")}</option></Select>
            </Field>
          </div>
          {doanVien && <Field label={t("members.joinedAt")}><Input type="date" min="1990-01-01" max={today} value={v.joinedAt} onChange={(e) => setV({ ...v, joinedAt: e.target.value })} /></Field>}
          <p className="text-xs text-muted">{t("members.ownProfileNote")}</p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>{t("members.cancel")}</Button>
            <Button loading={busy} disabled={v.fullName.trim().length < 2} onClick={async () => {
              const err = firstError(ownProfileSchema, v); if (err) return void toast.error(err);
              setBusy(true); const res = await updateOwnProfileAction(v); setBusy(false);
              if (reportResult(res)) { setOpen(false); router.refresh(); }
            }}>{t("members.save")}</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
