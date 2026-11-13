"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Ban, KeyRound, Pencil, Plus, RotateCcw } from "lucide-react";
import { Avatar, DataTable, EmptyState, StatusBadge, Td, Th } from "@/components/ui/misc";
import { createLeaderAction, updateLeaderAction, setLeaderStatusAction, resetLeaderPasswordAction } from "@/actions/leaders";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { ConfirmButton, Modal } from "@/components/ui/modal";
import { reportResult } from "@/components/ui/submit";
import type { SharedTeacher } from "@/lib/services/edu-integration";

type Leader = { id: string; fullName: string; username: string; position: string | null; status: "ACTIVE" | "LOCKED"; lastLoginAt: string | null };
const POSITIONS = ["Bí thư Đoàn trường", "Phó Bí thư Đoàn trường", "Ủy viên Ban Thường vụ Đoàn trường", "Ủy viên Ban chấp hành Đoàn trường"];
export function LeaderManager({ leaders, staff }: { leaders: Leader[]; staff: SharedTeacher[] }) {
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
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-[15px] font-semibold">Ban chấp hành Đoàn trường</h2><p className="mt-0.5 text-sm text-muted">{leaders.length} thành viên</p></div><Button onClick={() => setCreateOpen(true)}><Plus className="size-4" />Thêm BCH</Button></div>
    {createOpen && <Modal open onClose={() => setCreateOpen(false)} title="Thêm thành viên BCH"><div className="space-y-3">
      <Field label="Cách cấp tài khoản"><Select value={mode} onChange={(e) => setMode(e.target.value as "new" | "teacher")}><option value="new">Tạo tài khoản BCH riêng</option><option value="teacher" disabled={!staff.length}>Liên kết tài khoản giáo viên</option></Select></Field>
      {mode === "teacher" ? <Field label="Giáo viên" required><Select value={accountId} onChange={(e) => setAccountId(e.target.value)}><option value="">Chọn giáo viên</option>{staff.map((s) => <option key={s.accountId} value={s.accountId} disabled={!s.eligible}>{s.fullName} ({s.username}){!s.eligible ? " — đang khóa" : ""}</option>)}</Select></Field> : <>
        <Field label="Họ tên" required><Input value={fullName} maxLength={100} onChange={(e) => setFullName(e.target.value)} /></Field>
        <Field label="Tên đăng nhập BCH" required><Input value={username} maxLength={40} autoComplete="off" onChange={(e) => setUsername(e.target.value)} /></Field>
      </>}
      <Field label="Chức danh" required><Select value={position} onChange={(e) => setPosition(e.target.value)}>{POSITIONS.map((p) => <option key={p}>{p}</option>)}</Select></Field>
      <div className="flex justify-end gap-2 border-t border-border pt-3"><Button variant="secondary" onClick={() => setCreateOpen(false)}>Hủy</Button><Button loading={busy} disabled={mode === "teacher" ? !accountId : fullName.trim().length < 2 || username.trim().length < 3} onClick={async () => {
        setBusy(true);
        try {
          const r = await createLeaderAction(mode === "teacher" ? { mode, accountId, position } : { mode, fullName, username, position });
          if (reportResult(r)) { if (r.data) setCredentials(r.data); setCreateOpen(false); setAccountId(""); setUsername(""); setFullName(""); router.refresh(); }
        } finally { setBusy(false); }
      }}>{mode === "teacher" ? "Lưu phân công BCH" : "Tạo tài khoản BCH riêng"}</Button></div>
    </div></Modal>}
    {leaders.length ? <DataTable>
      <thead><tr><Th>Họ và tên</Th><Th>Chức danh</Th><Th>Tài khoản</Th><Th>Trạng thái</Th><Th className="text-right">Thao tác</Th></tr></thead>
      <tbody>{leaders.map((l) => {
        const shared = staff.some((s) => s.accountId === l.id);
        return <tr key={l.id}>
          <Td><div className="flex items-center gap-2.5"><Avatar name={l.fullName} /><div><p className="font-medium">{l.fullName}</p><p className="text-xs text-muted">{l.username}</p></div></div></Td>
          <Td>{l.position ?? "Chưa phân công"}</Td>
          <Td><StatusBadge tone={shared ? "blue" : "gray"}>{shared ? "Giáo viên liên kết" : "BCH riêng"}</StatusBadge></Td>
          <Td><StatusBadge tone={l.status === "ACTIVE" ? "green" : "red"}>{l.status === "ACTIVE" ? "Đang hoạt động" : "Đã khóa"}</StatusBadge></Td>
          <Td className="text-right whitespace-nowrap"><div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="sm" aria-label={`Sửa BCH ${l.fullName}`} title="Sửa chức danh" onClick={() => { setEditing(l); setEditPosition(l.position ?? POSITIONS[0]); setEditName(l.fullName); }}><Pencil className="size-3.5" /></Button>
            <ConfirmButton triggerVariant="ghost" triggerLabel={`Cấp lại mật khẩu ${l.fullName}`} trigger={<KeyRound className="size-3.5" />} title="Cấp lại mật khẩu BCH?" description={shared ? "Mật khẩu đăng nhập cả Cổng Đoàn và EduConnect sẽ thay đổi." : "Chỉ đổi mật khẩu tài khoản BCH riêng. Không đổi mật khẩu học sinh."} onConfirm={async () => { const r = await resetLeaderPasswordAction(l.id); if (reportResult(r) && r.data) setCredentials(r.data); }} />
            <ConfirmButton triggerVariant="ghost" triggerClassName={shared || l.status === "ACTIVE" ? "text-danger" : undefined} triggerLabel={shared ? `Thu hồi BCH ${l.fullName}` : l.status === "ACTIVE" ? `Khóa BCH ${l.fullName}` : `Mở khóa BCH ${l.fullName}`} trigger={shared || l.status === "ACTIVE" ? <Ban className="size-3.5" /> : <RotateCcw className="size-3.5" />} title="Thay đổi quyền truy cập BCH?" description={shared ? "Chỉ gỡ quyền Đoàn, giữ nguyên tài khoản giáo viên." : "Chỉ ảnh hưởng tài khoản BCH riêng."} danger={shared || l.status === "ACTIVE"} onConfirm={async () => { if (reportResult(await setLeaderStatusAction(l.id, shared || l.status === "ACTIVE" ? "LOCKED" : "ACTIVE"))) router.refresh(); }} />
          </div></Td>
        </tr>;
      })}</tbody>
    </DataTable> : <EmptyState title="Chưa có thành viên BCH" description="Bấm Thêm BCH để tạo tài khoản riêng hoặc chọn giáo viên." />}
    {editing && <Modal open onClose={() => setEditing(null)} title="Sửa BCH"><div className="space-y-3">
      {!staff.some((s) => s.accountId === editing.id) && <Field label="Họ tên"><Input value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={100} /></Field>}
      <Field label="Chức danh"><Input value={editPosition} onChange={(e) => setEditPosition(e.target.value)} maxLength={60} /></Field>
      <div className="flex justify-end gap-2 border-t border-border pt-3"><Button variant="secondary" onClick={() => setEditing(null)}>Hủy</Button><Button loading={busy} onClick={async () => { setBusy(true); try { const shared = staff.some((s) => s.accountId === editing.id); if (reportResult(await updateLeaderAction(editing.id, { position: editPosition, ...(shared ? {} : { fullName: editName }) }))) { setEditing(null); router.refresh(); } } finally { setBusy(false); } }}>Lưu</Button></div>
    </div></Modal>}
    {credentials && <Modal open title="Lưu mật khẩu BCH" onClose={() => setCredentials(null)}><div className="space-y-3 text-sm"><p>Mật khẩu chỉ hiển thị lần này. Người dùng phải đổi khi đăng nhập.</p><p>Tên đăng nhập: <b className="select-all">{credentials.username}</b></p><p>Mật khẩu: <b className="select-all">{credentials.password}</b></p><Button onClick={() => setCredentials(null)}>Đã lưu</Button></div></Modal>}
  </div>;
}
