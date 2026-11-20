"use client";
import { todayVN } from "@/lib/validation/rules";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { KeyRound, Lock, LockOpen, Pencil, PlusCircle, Trash2, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { adjustPointsAction, admitMemberAction, deleteMemberAction, resetMemberPasswordAction, setMemberAccountStatusAction } from "@/actions/members";
import { useT } from "@/lib/i18n/client";
import { Button, buttonClass } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { ConfirmButton, Modal } from "@/components/ui/modal";
import { Alert } from "@/components/ui/misc";
import { reportResult } from "@/components/ui/submit";
import { downloadAccounts } from "@/components/members/credentials";

export function MemberAdminActions({ id, locked, isAdmin, code, fullName, doanVien = true, canDelete = true }: { id: string; canDelete?: boolean; locked: boolean; isAdmin: boolean; code: string; fullName: string; doanVien?: boolean }) {
  const t = useT();
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
      {isAdmin && <Link href={`/members/${id}/edit`} aria-label={t("dact.edit")} className={buttonClass("secondary", "sm")}><Pencil className="size-3.5" /><span className="max-sm:hidden">{t("dact.edit")}</span></Link>}
      <ConfirmButton triggerLabel={t("dact.resetPw")} trigger={<><KeyRound className="size-3.5" /><span className="max-sm:hidden">{t("dact.resetPw")}</span></>} title={t("mact.resetQ")}
        description={t("mact.resetDesc")}
        onConfirm={async () => { const res = await resetMemberPasswordAction(id); if (reportResult(res)) { setPw(res.ok ? res.data!.password : null); if (res.ok) downloadAccounts([{ username: code, fullName, detail: "Cấp lại mật khẩu", password: res.data!.password }], `mat-khau-${code}.csv`, "Ghi chú"); } }} />
      {isAdmin && !doanVien && <Button size="sm" onClick={() => setAdmit(true)}><UserCheck className="size-3.5" /><span className="max-sm:hidden">{t("mact.admit")}</span></Button>}
      {isAdmin && (
        <>
          <Button variant="secondary" size="sm" aria-label={t("mact.adjust")} title={t("mact.adjust")} onClick={() => setAdjust(true)}><PlusCircle className="size-3.5" /><span className="max-sm:hidden">{t("mact.adjust")}</span></Button>
          <ConfirmButton triggerLabel={locked ? t("mact.activateAcc") : t("mact.lockAcc")} trigger={locked ? <><LockOpen className="size-3.5" /><span className="max-sm:hidden">{t("mact.activate")}</span></> : <><Lock className="size-3.5" /><span className="max-sm:hidden">{t("mact.lockAcc")}</span></>}
            title={locked ? t("mact.activateQ") : t("mact.lockQ")}
            description={locked ? t("mact.activateDesc") : t("mact.lockDesc")}
            danger={!locked} confirmLabel={locked ? t("mact.activate") : t("mact.lock")}
            onConfirm={async () => { reportResult(await setMemberAccountStatusAction(id, locked ? "ACTIVE" : "LOCKED")); router.refresh(); }} />
          {canDelete && <ConfirmButton triggerLabel={t("mact.deleteMember")} trigger={<><Trash2 className="size-3.5" /><span className="max-sm:hidden">{t("members.delete")}</span></>} triggerClassName="text-danger" title={t("mact.deleteQ")} danger confirmLabel={t("mact.deleteForever")}
            description={t("mact.deleteDesc")}
            onConfirm={async () => { if (reportResult(await deleteMemberAction(id))) { router.push("/members"); router.refresh(); } }} />}
        </>
      )}

      <Modal open={admit} onClose={() => setAdmit(false)} title={t("mact.admit")} className="max-w-sm">
        <div className="space-y-3">
          <p className="text-sm text-slate-600">{t("mact.admitDesc", { name: fullName })}</p>
          <Field label={t("members.joinedAt")}><Input type="date" min="1990-01-01" max={todayVN()} value={joined} onChange={(e) => setJoined(e.target.value)} /></Field>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setAdmit(false)}>{t("members.cancel")}</Button>
            <Button loading={busy} onClick={async () => { setBusy(true); const res = await admitMemberAction(id, joined); setBusy(false); if (reportResult(res)) { setAdmit(false); router.refresh(); } }}>{t("mact.admitBtn")}</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!pw} onClose={() => setPw(null)} title={t("mact.tempPw")} className="max-w-sm">
        <Alert tone="green">{t("mact.shownOnce")}</Alert>
        <p className="my-4 text-center font-mono text-xl tracking-wider select-all">{pw}</p>
        <div className="flex justify-end"><Button onClick={() => setPw(null)}>{t("members.close")}</Button></div>
      </Modal>

      <Modal open={adjust} onClose={() => setAdjust(false)} title={t("mact.adjustTitle")} className="max-w-sm">
        <div className="space-y-3">
          <Field label={t("mact.pointsLabel")}><Input type="number" value={points} onChange={(e) => setPoints(e.target.value)} placeholder={t("mact.pointsPh")} /></Field>
          <Field label={t("mact.reason")}><Input value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setAdjust(false)}>{t("members.cancel")}</Button>
            <Button loading={busy} onClick={async () => {
              setBusy(true);
              const res = await adjustPointsAction({ memberId: id, points, reason });
              setBusy(false);
              if (reportResult(res)) { setAdjust(false); setPoints(""); setReason(""); router.refresh(); }
            }}>{t("members.save")}</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
