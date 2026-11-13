"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { Avatar } from "@/components/ui/misc";
import { ConfirmButton } from "@/components/ui/modal";
import { reportResult } from "@/components/ui/submit";
import { assignMonitorAction, assignSecretaryAction, removeMonitorAction, removeSecretaryAction, setClassPresidentAction, setDeputyAction } from "@/actions/departments";

type Cand = { id: string; userId: string; label: string };
const NONE = "Chưa phân công";

function Person({ name }: { name?: string | null }) {
  if (!name) return <span className="text-sm text-muted">{NONE}</span>;
  return <span className="flex min-w-0 items-center gap-2"><Avatar name={name} size={36} /><span className="text-sm font-medium">{name}</span></span>;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="space-y-3 rounded-lg border border-border bg-white p-3"><div className="text-[11px] font-medium uppercase tracking-wide text-muted">{title}</div>{children}</div>;
}

/** Chọn người + nút hành động trên một dòng. */
function Picker({ candidates, label, submit, onSubmit, disabledIds }: { candidates: Cand[]; label: string; submit: string; onSubmit: (c: Cand) => ReturnType<typeof setClassPresidentAction> | ReturnType<typeof setDeputyAction>; disabledIds?: Set<string> }) {
  const [id, setId] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return <div className="flex items-center gap-2 border-t border-border pt-3">
    <div className="min-w-0 flex-1"><Select aria-label={label} value={id} onChange={(e) => setId(e.target.value)}><option value="">-- {label} --</option>{candidates.map((c) => <option key={c.id} value={c.id} disabled={disabledIds?.has(c.userId)}>{c.label}{disabledIds?.has(c.userId) ? " (đã giữ chức)" : ""}</option>)}</Select></div>
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
  const router = useRouter();
  const monitorIds = new Set(monitors.map((m) => m.userId));
  return <div className="space-y-3">
    <div className={`grid gap-3 md:grid-cols-2 ${showPresident ? "xl:grid-cols-4" : "xl:grid-cols-3"}`}>
      {showPresident && <Card title="Lớp trưởng">
        <div className="flex items-center justify-between gap-2"><Person name={president?.name} />
          {canEditPresident && president && <ConfirmButton trigger="Bỏ" triggerVariant="secondary" triggerClassName="shrink-0 border-red-300 text-danger hover:bg-red-50" title="Bỏ phân công lớp trưởng?" description="Học sinh vẫn là thành viên của Chi đoàn." danger confirmLabel="Bỏ"
            onConfirm={async () => { reportResult(await setClassPresidentAction({ departmentId, memberId: null })); router.refresh(); }} />}</div>
        {canEditPresident && <Picker candidates={presidentCandidates} label="chọn lớp trưởng" submit={president ? "Đổi" : "Chọn"} onSubmit={(c) => setClassPresidentAction({ departmentId, memberId: c.id })} />}
      </Card>}
      {showPresident && deputiesEnabled && <Card title="Lớp phó học tập">
        {deputies.length ? <ul className="space-y-2">{deputies.map((m) => <li key={m.memberId} className="flex items-center justify-between gap-2"><Person name={m.fullName} />
          {canEditPresident && <ConfirmButton trigger="Gỡ" triggerVariant="secondary" triggerClassName="shrink-0 border-red-300 text-danger hover:bg-red-50" title={`Gỡ chức lớp phó học tập của ${m.fullName}?`} description="Học sinh vẫn là thành viên của Chi đoàn." danger confirmLabel="Gỡ"
            onConfirm={async () => { reportResult(await setDeputyAction(departmentId, m.memberId, true)); router.refresh(); }} />}</li>)}</ul> : <span className="text-sm text-muted">{NONE}</span>}
        {canEditPresident && <Picker candidates={presidentCandidates} label="thêm lớp phó học tập" submit="Thêm" disabledIds={new Set(deputies.map((m) => m.memberId))} onSubmit={(c) => setDeputyAction(departmentId, c.id)} />}
      </Card>}
      <Card title="Bí thư">
        <div className="flex items-center justify-between gap-2"><Person name={secretary?.fullName} />
          {canEdit && secretary && <ConfirmButton trigger="Bỏ" triggerVariant="secondary" triggerClassName="shrink-0 border-red-300 text-danger hover:bg-red-50" title="Gỡ chức bí thư?" description="Tài khoản vẫn là đoàn viên của Chi đoàn." danger confirmLabel="Gỡ"
            onConfirm={async () => { reportResult(await removeSecretaryAction(departmentId)); router.refresh(); }} />}</div>
        {canEdit && <Picker candidates={candidates} label="chọn bí thư" submit={secretary ? "Đổi" : "Chọn"} disabledIds={secretary ? new Set([secretary.id]) : undefined} onSubmit={(c) => assignSecretaryAction({ departmentId, memberId: c.id })} />}
      </Card>
      <Card title="Cờ đỏ">
        {monitors.length ? <ul className="space-y-2">{monitors.map((m) => <li key={m.userId} className="flex items-center justify-between gap-2"><Person name={m.fullName} />
          {canEdit && <ConfirmButton trigger="Gỡ" triggerVariant="secondary" triggerClassName="shrink-0 border-red-300 text-danger hover:bg-red-50" title={`Gỡ chức cờ đỏ của ${m.fullName}?`} description="Tài khoản vẫn là đoàn viên của Chi đoàn." danger confirmLabel="Gỡ"
            onConfirm={async () => { reportResult(await removeMonitorAction(departmentId, m.userId)); router.refresh(); }} />}</li>)}</ul> : <span className="text-sm text-muted">{NONE}</span>}
        {canEdit && <Picker candidates={candidates} label="thêm cờ đỏ" submit="Thêm" disabledIds={monitorIds} onSubmit={(c) => assignMonitorAction({ departmentId, memberId: c.id })} />}
      </Card>
    </div>
    {canEdit && <p className="text-xs text-muted">Bí thư và cờ đỏ chọn từ đoàn viên của Chi đoàn; cờ đỏ ghi nhận vi phạm nề nếp cho mọi Chi đoàn trong trường. Phân công dùng chung với EduConnect.</p>}
  </div>;
}
