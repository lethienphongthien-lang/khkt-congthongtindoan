"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "@/lib/i18n/client";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { Avatar } from "@/components/ui/misc";
import { ConfirmButton } from "@/components/ui/modal";
import { reportResult } from "@/components/ui/submit";
import { assignMonitorAction, assignSecretaryAction, removeMonitorAction, removeSecretaryAction, setClassPresidentAction, setDeputyAction } from "@/actions/departments";

type Cand = { id: string; userId: string; label: string };

function Person({ name }: { name?: string | null }) {
  const t = useT();
  if (!name) return <span className="text-sm text-muted">{t("dept.unassigned")}</span>;
  return <span className="flex min-w-0 items-center gap-2"><Avatar name={name} size={36} /><span className="text-sm font-medium">{name}</span></span>;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="space-y-3 rounded-lg border border-border bg-white p-3"><div className="text-[11px] font-medium uppercase tracking-wide text-muted">{title}</div>{children}</div>;
}

/** Chọn người + nút hành động trên một dòng. */
function Picker({ candidates, label, submit, onSubmit, disabledIds }: { candidates: Cand[]; label: string; submit: string; onSubmit: (c: Cand) => ReturnType<typeof setClassPresidentAction> | ReturnType<typeof setDeputyAction>; disabledIds?: Set<string> }) {
  const t = useT();
  const [id, setId] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return <div className="flex items-center gap-2 border-t border-border pt-3">
    <div className="min-w-0 flex-1"><Select aria-label={label} value={id} onChange={(e) => setId(e.target.value)}><option value="">-- {label} --</option>{candidates.map((c) => <option key={c.id} value={c.id} disabled={disabledIds?.has(c.userId)}>{c.label}{disabledIds?.has(c.userId) ? " (" + t("dp.held") + ")" : ""}</option>)}</Select></div>
    <Button className="shrink-0" loading={busy} disabled={!id} onClick={async () => {
      const c = candidates.find((x) => x.id === id); if (!c) return;
      setBusy(true); try { if (reportResult(await onSubmit(c))) { setId(""); router.refresh(); } } finally { setBusy(false); }
    }}>{submit}</Button>
  </div>;
}

export function DepartmentPersonnel({ departmentId, deputies, deputiesEnabled, president, secretary, monitors, candidates, presidentCandidates, showPresident, canEditPresident, canEdit }: {
  departmentId: string; deputies: { memberId: string; userId: string; fullName: string }[]; deputiesEnabled: boolean; president: { id: string | null; name: string } | null; secretary: { id: string; fullName: string } | null; monitors: { userId: string; fullName: string }[];
  candidates: Cand[]; presidentCandidates: Cand[]; showPresident: boolean; canEditPresident: boolean; canEdit: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const monitorIds = new Set(monitors.map((m) => m.userId));
  return <div className="space-y-3">
    <div className={`grid gap-3 md:grid-cols-2 ${showPresident ? "xl:grid-cols-4" : "xl:grid-cols-3"}`}>
      {showPresident && <Card title={t("dp.president")}>
        <div className="flex items-center justify-between gap-2"><Person name={president?.name} />
          {canEditPresident && president && <ConfirmButton trigger={t("dp.drop")} triggerVariant="secondary" triggerClassName="shrink-0 border-red-300 text-danger hover:bg-red-50" title={t("dp.dropPresQ")} description={t("dp.stillMemberStudent")} danger confirmLabel={t("dp.drop")}
            onConfirm={async () => { reportResult(await setClassPresidentAction({ departmentId, memberId: null })); router.refresh(); }} />}</div>
        {canEditPresident && <Picker candidates={presidentCandidates} label={t("dp.pickPres")} submit={president ? t("dp.change") : t("dp.pick")} onSubmit={(c) => setClassPresidentAction({ departmentId, memberId: c.id })} />}
      </Card>}
      {showPresident && deputiesEnabled && <Card title={t("dp.deputy")}>
        {deputies.length ? <ul className="space-y-2">{deputies.map((m) => <li key={m.memberId} className="flex items-center justify-between gap-2"><Person name={m.fullName} />
          {canEditPresident && <ConfirmButton trigger={t("dact.remove")} triggerVariant="secondary" triggerClassName="shrink-0 border-red-300 text-danger hover:bg-red-50" title={t("dp.removeDepQ", { name: m.fullName })} description={t("dp.stillMemberStudent")} danger confirmLabel={t("dact.remove")}
            onConfirm={async () => { reportResult(await setDeputyAction(departmentId, m.memberId, true)); router.refresh(); }} />}</li>)}</ul> : <span className="text-sm text-muted">{t("dept.unassigned")}</span>}
        {canEditPresident && <Picker candidates={presidentCandidates} label={t("dp.addDeputy")} submit={t("members.add")} disabledIds={new Set(deputies.map((m) => m.memberId))} onSubmit={(c) => setDeputyAction(departmentId, c.id)} />}
      </Card>}
      <Card title={t("dept.secretary")}>
        <div className="flex items-center justify-between gap-2"><Person name={secretary?.fullName} />
          {canEdit && secretary && <ConfirmButton trigger={t("dp.drop")} triggerVariant="secondary" triggerClassName="shrink-0 border-red-300 text-danger hover:bg-red-50" title={t("dact.removeSecQ")} description={t("dact.stillMember")} danger confirmLabel={t("dact.remove")}
            onConfirm={async () => { reportResult(await removeSecretaryAction(departmentId)); router.refresh(); }} />}</div>
        {canEdit && <Picker candidates={candidates} label={t("dp.pickSec")} submit={secretary ? t("dp.change") : t("dp.pick")} disabledIds={secretary ? new Set([secretary.id]) : undefined} onSubmit={(c) => assignSecretaryAction({ departmentId, memberId: c.id })} />}
      </Card>
      <Card title={t("dact.redFlag")}>
        {monitors.length ? <ul className="space-y-2">{monitors.map((m) => <li key={m.userId} className="flex items-center justify-between gap-2"><Person name={m.fullName} />
          {canEdit && <ConfirmButton trigger={t("dact.remove")} triggerVariant="secondary" triggerClassName="shrink-0 border-red-300 text-danger hover:bg-red-50" title={t("dact.removeRfQ", { name: m.fullName })} description={t("dact.stillMember")} danger confirmLabel={t("dact.remove")}
            onConfirm={async () => { reportResult(await removeMonitorAction(departmentId, m.userId)); router.refresh(); }} />}</li>)}</ul> : <span className="text-sm text-muted">{t("dept.unassigned")}</span>}
        {canEdit && <Picker candidates={candidates} label={t("dp.addRf")} submit={t("members.add")} disabledIds={monitorIds} onSubmit={(c) => assignMonitorAction({ departmentId, memberId: c.id })} />}
      </Card>
    </div>
    {canEdit && <p className="text-xs text-muted">{t("dp.note")}</p>}
  </div>;
}
