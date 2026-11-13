"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
  return <div className="max-w-3xl space-y-4">
    <p className="text-sm text-muted">Giáo viên có thể dùng chung tài khoản EduConnect. Học sinh tham gia BCH dùng tài khoản BCH riêng, giữ nguyên tài khoản học sinh. Cổng Đoàn có thể tạo và quản lý BCH khi không dùng EduConnect.</p>
    <div className="space-y-3 rounded-lg border bg-white p-4">
      <Field label="Cách cấp tài khoản"><Select value={mode} onChange={(e) => setMode(e.target.value as "new" | "teacher")}><option value="new">Tạo tài khoản BCH riêng</option><option value="teacher" disabled={!staff.length}>Liên kết tài khoản giáo viên</option></Select></Field>
      {mode === "teacher" ? <Field label="Giáo viên" required><Select value={accountId} onChange={(e) => setAccountId(e.target.value)}><option value="">Chọn giáo viên</option>{staff.map((s) => <option key={s.accountId} value={s.accountId} disabled={!s.eligible}>{s.fullName} ({s.username}){!s.eligible ? " — đang khóa" : ""}</option>)}</Select></Field> : <>
        <Field label="Họ tên" required><Input value={fullName} maxLength={100} onChange={(e) => setFullName(e.target.value)} /></Field>
        <Field label="Tên đăng nhập BCH" required><Input value={username} maxLength={40} autoComplete="off" onChange={(e) => setUsername(e.target.value)} /></Field>
      </>}
      <Field label="Chức danh" required><Select value={position} onChange={(e) => setPosition(e.target.value)}>{POSITIONS.map((p) => <option key={p}>{p}</option>)}</Select></Field>
      <Button loading={busy} disabled={mode === "teacher" ? !accountId : fullName.trim().length < 2 || username.trim().length < 3} onClick={async () => {
        setBusy(true);
        try {
          const r = await createLeaderAction(mode === "teacher" ? { mode, accountId, position } : { mode, fullName, username, position });
          if (reportResult(r)) { if (r.data) setCredentials(r.data); setAccountId(""); setUsername(""); setFullName(""); router.refresh(); }
        } finally { setBusy(false); }
      }}>{mode === "teacher" ? "Lưu phân công BCH" : "Tạo tài khoản BCH riêng"}</Button>
    </div>
    <ul className="divide-y rounded-lg border bg-white">{leaders.map((l) => {
      const shared = staff.some((s) => s.accountId === l.id);
      return <li key={l.id} className="space-y-2 p-4">
        <div><b>{l.fullName}</b><p className="text-sm text-muted">{l.position} · {l.username} · {l.status === "ACTIVE" ? "Đang hoạt động" : "Đã khóa"}</p><p className="text-xs text-muted">{shared ? "Dùng chung tài khoản giáo viên EduConnect" : "Tài khoản BCH riêng"}</p></div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => { setEditing(l); setEditPosition(l.position ?? POSITIONS[0]); setEditName(l.fullName); }}>Sửa chức danh</Button>
          <ConfirmButton trigger="Cấp lại mật khẩu" title="Cấp lại mật khẩu BCH?" description={shared ? "Mật khẩu đăng nhập cả Cổng Đoàn và EduConnect sẽ thay đổi." : "Chỉ đổi mật khẩu tài khoản BCH riêng. Không đổi mật khẩu học sinh."} onConfirm={async () => { const r = await resetLeaderPasswordAction(l.id); if (reportResult(r) && r.data) setCredentials(r.data); }} />
          <ConfirmButton trigger={shared ? "Thu hồi BCH" : l.status === "ACTIVE" ? "Khóa BCH" : "Mở khóa BCH"} title="Thay đổi quyền truy cập BCH?" description={shared ? "Chỉ gỡ quyền Đoàn, giữ nguyên tài khoản giáo viên." : "Chỉ ảnh hưởng tài khoản BCH riêng."} danger={l.status === "ACTIVE"} onConfirm={async () => { if (reportResult(await setLeaderStatusAction(l.id, shared || l.status === "ACTIVE" ? "LOCKED" : "ACTIVE"))) router.refresh(); }} />
        </div>
      </li>;
    })}</ul>
    {editing && <Modal open onClose={() => setEditing(null)} title="Sửa BCH"><div className="space-y-3">
      {!staff.some((s) => s.accountId === editing.id) && <Field label="Họ tên"><Input value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={100} /></Field>}
      <Field label="Chức danh"><Input value={editPosition} onChange={(e) => setEditPosition(e.target.value)} maxLength={60} /></Field>
      <Button loading={busy} onClick={async () => { setBusy(true); try { const shared = staff.some((s) => s.accountId === editing.id); if (reportResult(await updateLeaderAction(editing.id, { position: editPosition, ...(shared ? {} : { fullName: editName }) }))) { setEditing(null); router.refresh(); } } finally { setBusy(false); } }}>Lưu</Button>
    </div></Modal>}
    {credentials && <Modal open title="Lưu mật khẩu BCH" onClose={() => setCredentials(null)}><div className="space-y-3 text-sm"><p>Mật khẩu chỉ hiển thị lần này. Người dùng phải đổi khi đăng nhập.</p><p>Tên đăng nhập: <b className="select-all">{credentials.username}</b></p><p>Mật khẩu: <b className="select-all">{credentials.password}</b></p><Button onClick={() => setCredentials(null)}>Đã lưu</Button></div></Modal>}
  </div>;
}
