"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { createViolationAction, deleteViolationAction, getDepartmentMembersAction } from "@/actions/violations";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { ConfirmButton, Modal } from "@/components/ui/modal";
import { reportResult } from "@/components/ui/submit";

const VIOLATION_TYPES = ["Đồng phục", "Tác phong", "Vệ sinh", "Giờ giấc", "Nề nếp sinh hoạt", "Khác"];

/** Ghi nhận vi phạm: chọn Chi đoàn trước (cờ đỏ chấm nề nếp mọi Chi đoàn), rồi chọn đoàn viên của Chi đoàn đó. */
export function ViolationButton({ departments }: { departments: { id: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [departmentId, setDepartmentId] = useState("");
  const [members, setMembers] = useState<{ id: string; fullName: string; code: string }[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [memberId, setMemberId] = useState("");
  const [type, setType] = useState(VIOLATION_TYPES[0]);
  const [content, setContent] = useState("");
  const [recordedAt, setRecordedAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [busy, setBusy] = useState(false);
  const close = () => { setOpen(false); setDepartmentId(""); setMembers([]); setMemberId(""); setContent(""); };

  useEffect(() => {
    if (!departmentId) { setMembers([]); return; }
    let off = false;
    setLoadingMembers(true); setMemberId("");
    getDepartmentMembersAction(departmentId).then((r) => { if (!off) { setMembers(r.ok && r.data ? r.data.members : []); setLoadingMembers(false); } });
    return () => { off = true; };
  }, [departmentId]);

  return (
    <>
      <Button onClick={() => setOpen(true)}><Plus className="size-4" />Ghi nhận vi phạm</Button>
      <Modal open={open} onClose={close} title="Ghi nhận vi phạm" className="max-w-md">
        <div className="space-y-3">
          <Field label="Chi đoàn vi phạm" required><Select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}><option value="">Chọn...</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select></Field>
          {departmentId && (
            loadingMembers ? <p className="text-sm text-muted">Đang tải danh sách đoàn viên...</p>
            : members.length === 0 ? <p className="text-sm text-muted">Chi đoàn chưa có đoàn viên.</p> : (
              <Field label="Đoàn viên vi phạm" required><Select value={memberId} onChange={(e) => setMemberId(e.target.value)}><option value="">Chọn...</option>{members.map((c) => <option key={c.id} value={c.id}>{c.fullName} ({c.code})</option>)}</Select></Field>
            )
          )}
          <Field label="Loại vi phạm" required><Select value={type} onChange={(e) => setType(e.target.value)}>{VIOLATION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</Select></Field>
          <Field label="Nội dung" required><Textarea value={content} onChange={(e) => setContent(e.target.value)} className="min-h-20" placeholder="Mô tả cụ thể vi phạm" /></Field>
          <Field label="Thời gian" required><Input type="datetime-local" value={recordedAt} onChange={(e) => setRecordedAt(e.target.value)} /></Field>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={close}>Hủy</Button>
            <Button loading={busy} disabled={!departmentId || !memberId || !content.trim()} onClick={async () => {
              setBusy(true);
              const res = await createViolationAction({ departmentId, memberId, type, content, recordedAt: new Date(recordedAt) });
              setBusy(false);
              if (reportResult(res)) { close(); router.refresh(); }
            }}>Ghi nhận</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export function DeleteViolationButton({ id }: { id: string }) {
  const router = useRouter();
  return (
    <ConfirmButton trigger={<Trash2 className="size-3.5" />} triggerVariant="ghost" triggerClassName="text-danger" title="Xóa vi phạm này?" danger confirmLabel="Xóa"
      onConfirm={async () => { reportResult(await deleteViolationAction(id)); router.refresh(); }} />
  );
}
