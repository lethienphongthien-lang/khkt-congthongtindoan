"use client";
import { toast } from "sonner";
import { firstError } from "@/lib/validation";
import { personName, nameOnly } from "@/lib/validation/rules";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Ban, KeyRound, Pencil, Plus, RotateCcw } from "lucide-react";
import { createLeaderAction, resetLeaderPasswordAction, setLeaderStatusAction, updateLeaderAction } from "@/actions/leaders";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { ConfirmButton, Modal } from "@/components/ui/modal";
import { Alert, StatusBadge } from "@/components/ui/misc";
import { reportResult } from "@/components/ui/submit";
import { csvStamp, downloadAccounts } from "@/components/members/credentials";

type Leader = { id: string; fullName: string; username: string; position: string | null; status: "ACTIVE" | "LOCKED"; lastLoginAt: string | null };
const POSITIONS = ["Bí thư Đoàn trường", "Phó Bí thư Đoàn trường", "Ủy viên Ban Thường vụ Đoàn trường", "Ủy viên Ban chấp hành Đoàn trường"];
const fmt = (iso: string) => new Date(iso).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "short" });

function Credentials({ username, password, onClose }: { username: string; password: string; onClose: () => void }) {
  return (
    <Modal open onClose={onClose} title="Thông tin đăng nhập" className="max-w-md">
      <div className="space-y-3 text-sm">
        <Alert tone="green">Mật khẩu tạm thời <b>chỉ hiển thị một lần</b> (tệp CSV đã được tải về máy bạn). Hãy gửi cho người dùng; họ phải đổi mật khẩu ở lần đăng nhập đầu.</Alert>
        <p>Tên đăng nhập: <b className="font-mono select-all">{username}</b></p>
        <p>Mật khẩu tạm: <b className="font-mono select-all">{password}</b></p>
        <div className="flex justify-end"><Button onClick={onClose}>Đã lưu lại</Button></div>
      </div>
    </Modal>
  );
}

function LeaderForm({ leader, onClose, onCreated }: { leader?: Leader; onClose: () => void; onCreated?: (c: { username: string; password: string }) => void }) {
  const router = useRouter();
  const initial = leader?.position ?? POSITIONS[0];
  const preset = POSITIONS.includes(initial) ? initial : "__other";
  const [fullName, setFullName] = useState(leader?.fullName ?? "");
  const [username, setUsername] = useState(leader?.username ?? "");
  const [choice, setChoice] = useState(preset);
  const [custom, setCustom] = useState(preset === "__other" ? initial : "");
  const [busy, setBusy] = useState(false);
  const position = choice === "__other" ? custom : choice;
  return (
    <Modal open onClose={onClose} title={leader ? "Sửa tài khoản Ban chấp hành" : "Cấp tài khoản Ban chấp hành"} className="max-w-md">
      <div className="space-y-3">
        <Field label="Họ tên" required><Input value={fullName} maxLength={100} onChange={(e) => setFullName(nameOnly(e.target.value))} /></Field>
        {!leader && <Field label="Tên đăng nhập" required hint="Chữ, số và . _ - (tối thiểu 3 ký tự)"><Input value={username} maxLength={40} autoCapitalize="none" onChange={(e) => setUsername(e.target.value)} /></Field>}
        <Field label="Chức danh" required>
          <Select value={choice} onChange={(e) => setChoice(e.target.value)}>
            {POSITIONS.map((p) => <option key={p}>{p}</option>)}
            <option value="__other">Khác...</option>
          </Select>
        </Field>
        {choice === "__other" && <Field label="Nhập chức danh"><Input value={custom} maxLength={60} onChange={(e) => setCustom(e.target.value)} /></Field>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Hủy</Button>
          <Button loading={busy} disabled={fullName.trim().length < 2 || position.trim().length < 2 || (!leader && username.trim().length < 3)} onClick={async () => {
            const err = firstError(personName("họ tên"), fullName)
              ?? (!leader && !/^[a-zA-Z0-9._-]{3,40}$/.test(username.trim()) ? "Tên đăng nhập 3-40 ký tự, chỉ gồm chữ, số, . _ -" : null);
            if (err) return void toast.error(err);
            setBusy(true);
            if (leader) {
              const res = await updateLeaderAction(leader.id, { fullName, position });
              setBusy(false);
              if (reportResult(res)) { onClose(); router.refresh(); }
            } else {
              const res = await createLeaderAction({ fullName, username, position });
              setBusy(false);
              if (reportResult(res) && res.data) { onClose(); onCreated?.(res.data); downloadAccounts([{ username: res.data.username, fullName, detail: position, password: res.data.password }], `tai-khoan-${res.data.username}-${csvStamp()}.csv`, "Chức danh"); router.refresh(); }
            }
          }}>{leader ? "Lưu" : "Cấp tài khoản"}</Button>
        </div>
      </div>
    </Modal>
  );
}

export function LeaderManager({ leaders }: { leaders: Leader[] }) {
  const router = useRouter();
  const [form, setForm] = useState<{ leader?: Leader } | null>(null);
  const [cred, setCred] = useState<{ username: string; password: string } | null>(null);
  return (
    <div className="max-w-3xl space-y-4">
      <p className="text-sm text-muted">Tài khoản cho <b>Bí thư, Phó Bí thư và các thành viên Ban chấp hành Đoàn trường</b>. Họ có đầy đủ quyền quản lý như Admin hiện tại (đoàn viên, Chi đoàn, hoạt động, thi đua, cổng thông tin, duyệt bài...), nhưng <b>không được cấp hay thu hồi</b> tài khoản Ban chấp hành. Việc này chỉ Quản trị hệ thống làm được.</p>
      <Button onClick={() => setForm({})}><Plus className="size-4" />Cấp tài khoản</Button>
      {leaders.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-white/70 px-4 py-8 text-center text-sm text-muted">Chưa có tài khoản Ban chấp hành nào.</div>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-white/85">
          {leaders.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
              <div className="min-w-0 flex-1 basis-56">
                <div className="flex items-center gap-2"><span className="truncate font-medium">{l.fullName}</span><StatusBadge tone={l.status === "ACTIVE" ? "green" : "red"}>{l.status === "ACTIVE" ? "Đang hoạt động" : "Đã thu hồi"}</StatusBadge></div>
                <div className="text-xs text-muted">{l.position} · <span className="font-mono">{l.username}</span>{l.lastLoginAt ? ` · đăng nhập gần nhất ${fmt(l.lastLoginAt)}` : " · chưa đăng nhập"}</div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" aria-label="Sửa" title="Sửa" onClick={() => setForm({ leader: l })}><Pencil className="size-3.5" /></Button>
                <ConfirmButton triggerVariant="ghost" triggerLabel="Cấp lại mật khẩu" trigger={<KeyRound className="size-3.5" />} title="Cấp lại mật khẩu tạm thời?" description="Mật khẩu cũ và các thiết bị đăng nhập nhanh của tài khoản này sẽ bị vô hiệu."
                  confirmLabel="Cấp lại" onConfirm={async () => { const r = await resetLeaderPasswordAction(l.id); if (reportResult(r) && r.data) { setCred({ username: l.username, password: r.data.password }); downloadAccounts([{ username: l.username, fullName: l.fullName, detail: l.position ?? "", password: r.data.password }], `mat-khau-${l.username}-${csvStamp()}.csv`, "Chức danh"); } }} />
                {l.status === "ACTIVE" ? (
                  <ConfirmButton triggerVariant="ghost" triggerClassName="text-danger" triggerLabel="Thu hồi" trigger={<Ban className="size-3.5" />} title={`Thu hồi tài khoản của ${l.fullName}?`} danger confirmLabel="Thu hồi"
                    description="Tài khoản bị khóa và mất quyền ngay lập tức. Dữ liệu và lịch sử thao tác được giữ nguyên, có thể cấp lại sau."
                    onConfirm={async () => { reportResult(await setLeaderStatusAction(l.id, "LOCKED")); router.refresh(); }} />
                ) : (
                  <ConfirmButton triggerVariant="ghost" triggerLabel="Cấp lại quyền" trigger={<RotateCcw className="size-3.5" />} title={`Cấp lại quyền cho ${l.fullName}?`} confirmLabel="Cấp lại"
                    onConfirm={async () => { reportResult(await setLeaderStatusAction(l.id, "ACTIVE")); router.refresh(); }} />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {form && <LeaderForm leader={form.leader} onClose={() => setForm(null)} onCreated={setCred} />}
      {cred && <Credentials {...cred} onClose={() => setCred(null)} />}
    </div>
  );
}
