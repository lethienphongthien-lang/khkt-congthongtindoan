"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Ban, KeyRound, Pencil, Plus, RotateCcw } from "lucide-react";
import { Avatar, DataTable, EmptyState, StatusBadge, Td, Th } from "@/components/ui/misc";
import { createLeaderAction, updateLeaderAction, setLeaderStatusAction, resetLeaderPasswordAction } from "@/actions/leaders";
import { useT } from "@/lib/i18n/client";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { ConfirmButton, Modal } from "@/components/ui/modal";
import { reportResult } from "@/components/ui/submit";
import type { SharedTeacher } from "@/lib/services/edu-integration";

type Leader = { id: string; fullName: string; username: string; position: string | null; status: "ACTIVE" | "LOCKED"; lastLoginAt: string | null };
const POSITIONS = ["Bí thư Đoàn trường", "Phó Bí thư Đoàn trường", "Ủy viên Ban Thường vụ Đoàn trường", "Ủy viên Ban chấp hành Đoàn trường"];
export function LeaderManager({ leaders, staff }: { leaders: Leader[]; staff: SharedTeacher[] }) {
  const t = useT();
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [mode, setMode] = useState<"teacher" | "new">("new");
  const [accountId, setAccountId] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [position, setPosition] = useState(POSITIONS[0]);
  const [busy, setBusy] = useState(false);
  const [credentials, setCredentials] = useState<{ username: string; password: string } | null>(null);
  const [editing, setEditing] = useState<Leader | null>(null);
  const [editPosition, setEditPosition] = useState("");
  const [editName, setEditName] = useState("");
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-[15px] font-semibold">{t("ui.ld.title")}</h2><p className="mt-0.5 text-sm text-muted">{t("ui.ld.count", { n: leaders.length })}</p></div><Button onClick={() => setCreateOpen(true)}><Plus className="size-4" />{t("ui.ld.add")}</Button></div>
    {createOpen && <Modal open onClose={() => setCreateOpen(false)} title={t("ui.ld.addTitle")}><div className="space-y-3">
      <Field label={t("ui.ld.mode")}><Select value={mode} onChange={(e) => setMode(e.target.value as "new" | "teacher")}><option value="new">{t("ui.ld.modeNew")}</option><option value="teacher" disabled={!staff.length}>{t("ui.ld.modeTeacher")}</option></Select></Field>
      {mode === "teacher" ? <Field label={t("ui.ld.teacher")} required><Select value={accountId} onChange={(e) => setAccountId(e.target.value)}><option value="">{t("ui.ld.pickTeacher")}</option>{staff.map((s) => <option key={s.accountId} value={s.accountId} disabled={!s.eligible}>{s.fullName} ({s.username}){!s.eligible ? t("ui.ld.locked") : ""}</option>)}</Select></Field> : <>
        <Field label={t("ui.ld.fullName")} required><Input value={fullName} maxLength={100} onChange={(e) => setFullName(e.target.value)} /></Field>
        <Field label={t("ui.ld.username")} required><Input value={username} maxLength={40} autoComplete="off" onChange={(e) => setUsername(e.target.value)} /></Field>
      </>}
      <Field label={t("ui.ld.position")} required><Select value={position} onChange={(e) => setPosition(e.target.value)}>{POSITIONS.map((p) => <option key={p}>{p}</option>)}</Select></Field>
      <div className="flex justify-end gap-2 border-t border-border pt-3"><Button variant="secondary" onClick={() => setCreateOpen(false)}>{t("app.ui.cancel")}</Button><Button loading={busy} disabled={mode === "teacher" ? !accountId : fullName.trim().length < 2 || username.trim().length < 3} onClick={async () => {
        setBusy(true);
        try {
          const r = await createLeaderAction(mode === "teacher" ? { mode, accountId, position } : { mode, fullName, username, position });
          if (reportResult(r)) { if (r.data) setCredentials(r.data); setCreateOpen(false); setAccountId(""); setUsername(""); setFullName(""); router.refresh(); }
        } finally { setBusy(false); }
      }}>{mode === "teacher" ? t("ui.ld.saveAssign") : t("ui.ld.createAcc")}</Button></div>
    </div></Modal>}
    {leaders.length ? <DataTable>
      <thead><tr><Th>{t("ui.ld.colName")}</Th><Th>{t("ui.ld.position")}</Th><Th>{t("ui.ld.colAccount")}</Th><Th>{t("ui.ld.colStatus")}</Th><Th className="text-right">{t("ui.ld.colActions")}</Th></tr></thead>
      <tbody>{leaders.map((l) => {
        const shared = staff.some((s) => s.accountId === l.id);
        return <tr key={l.id}>
          <Td><div className="flex items-center gap-2.5"><Avatar name={l.fullName} /><div><p className="font-medium">{l.fullName}</p><p className="text-xs text-muted">{l.username}</p></div></div></Td>
          <Td>{l.position ?? t("ui.ld.noPos")}</Td>
          <Td><StatusBadge tone={shared ? "blue" : "gray"}>{shared ? t("ui.ld.linked") : t("ui.ld.own")}</StatusBadge></Td>
          <Td><StatusBadge tone={l.status === "ACTIVE" ? "green" : "red"}>{l.status === "ACTIVE" ? t("ui.ld.active") : t("ui.ld.lockedS")}</StatusBadge></Td>
          <Td className="text-right whitespace-nowrap"><div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="sm" aria-label={t("ui.ld.editAria", { name: l.fullName })} title={t("ui.ld.editPos")} onClick={() => { setEditing(l); setEditPosition(l.position ?? POSITIONS[0]); setEditName(l.fullName); }}><Pencil className="size-3.5" /></Button>
            <ConfirmButton triggerVariant="ghost" triggerLabel={t("ui.ld.resetAria", { name: l.fullName })} trigger={<KeyRound className="size-3.5" />} title={t("ui.ld.resetTitle")} description={shared ? t("ui.ld.resetShared") : t("ui.ld.resetOwn")} onConfirm={async () => { const r = await resetLeaderPasswordAction(l.id); if (reportResult(r) && r.data) setCredentials(r.data); }} />
            <ConfirmButton triggerVariant="ghost" triggerClassName={shared || l.status === "ACTIVE" ? "text-danger" : undefined} triggerLabel={shared ? t("ui.ld.revoke", { name: l.fullName }) : l.status === "ACTIVE" ? t("ui.ld.lock", { name: l.fullName }) : t("ui.ld.unlock", { name: l.fullName })} trigger={shared || l.status === "ACTIVE" ? <Ban className="size-3.5" /> : <RotateCcw className="size-3.5" />} title={t("ui.ld.accessTitle")} description={shared ? t("ui.ld.accessShared") : t("ui.ld.accessOwn")} danger={shared || l.status === "ACTIVE"} onConfirm={async () => { if (reportResult(await setLeaderStatusAction(l.id, shared || l.status === "ACTIVE" ? "LOCKED" : "ACTIVE"))) router.refresh(); }} />
          </div></Td>
        </tr>;
      })}</tbody>
    </DataTable> : <EmptyState title={t("ui.ld.emptyTitle")} description={t("ui.ld.emptyDesc")} />}
    {editing && <Modal open onClose={() => setEditing(null)} title={t("ui.ld.editTitle")}><div className="space-y-3">
      {!staff.some((s) => s.accountId === editing.id) && <Field label={t("ui.ld.fullName")}><Input value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={100} /></Field>}
      <Field label={t("ui.ld.position")}><Input value={editPosition} onChange={(e) => setEditPosition(e.target.value)} maxLength={60} /></Field>
      <div className="flex justify-end gap-2 border-t border-border pt-3"><Button variant="secondary" onClick={() => setEditing(null)}>{t("app.ui.cancel")}</Button><Button loading={busy} onClick={async () => { setBusy(true); try { const shared = staff.some((s) => s.accountId === editing.id); if (reportResult(await updateLeaderAction(editing.id, { position: editPosition, ...(shared ? {} : { fullName: editName }) }))) { setEditing(null); router.refresh(); } } finally { setBusy(false); } }}>{t("ui.save")}</Button></div>
    </div></Modal>}
    {credentials && <Modal open title={t("ui.ld.pwTitle")} onClose={() => setCredentials(null)}><div className="space-y-3 text-sm"><p>{t("ui.ld.pwNote")}</p><p>{t("ui.ld.pwUser")} <b className="select-all">{credentials.username}</b></p><p>{t("ui.ld.pwPass")} <b className="select-all">{credentials.password}</b></p><Button onClick={() => setCredentials(null)}>{t("ui.ld.saved")}</Button></div></Modal>}
  </div>;
}
