"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CalendarSync, Download, Pencil, Plus, Trash2, UserCog, UserPlus } from "lucide-react";
import { addMembersToDepartmentAction, syncSchoolYearAction, assignSecretaryAction, deleteDepartmentAction, removeSecretaryAction, saveDepartmentAction } from "@/actions/departments";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { PeopleInput } from "@/components/members/people-input";
import { ConfirmButton, Modal } from "@/components/ui/modal";
import { Alert, DataTable, Td, Th } from "@/components/ui/misc";
import { csvStamp, downloadCsv } from "@/components/members/credentials";
import type { Credential } from "@/actions/members";
import { reportResult } from "@/components/ui/submit";
import { cohortLabel, schoolYearStart } from "@/lib/school-year";

type Dept = { id: string; name: string; description: string | null; startYear?: number | null; isTeacher?: boolean };

export function DepartmentFormButton({ dept }: { dept?: Dept }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(dept?.name ?? "");
  const [description, setDescription] = useState(dept?.description ?? "");
  const [startYear, setStartYear] = useState(String(dept?.startYear ?? ""));
  const [isTeacher, setIsTeacher] = useState(!!dept?.isTeacher); // chỉ chọn được lúc tạo
  const [memberText, setMemberText] = useState("");
  const [youthText, setYouthText] = useState("");
  const [peopleKey, setPeopleKey] = useState(0);
  const [created, setCreated] = useState<Credential[] | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <Button variant={dept ? "ghost" : "primary"} size={dept ? "sm" : "md"} onClick={() => setOpen(true)} aria-label={dept ? "Sửa" : "Tạo Chi đoàn"}>
        {dept ? <Pencil className="size-3.5" /> : <><Plus className="size-4" />Tạo Chi đoàn</>}
      </Button>
      <Modal open={open} onClose={() => { setOpen(false); setCreated(null); }} title={dept ? "Sửa Chi đoàn" : "Tạo Chi đoàn"} className={dept ? "max-w-md" : "max-w-6xl"}>
        {created ? (
          <div className="space-y-3">
            <Alert tone="green">Đã tạo {created.length} tài khoản. <b>Mật khẩu tạm thời chỉ hiển thị một lần</b> – tệp CSV đã được tải về máy bạn, hãy bàn giao. Sau khi bầu bí thư, dùng nút "Chọn bí thư" để gán quyền cho một đoàn viên.</Alert>
            <Button variant="secondary" size="sm" onClick={() => downloadCsv(created, `tai-khoan-${name || "chi-doan"}.csv`)}><Download className="size-4" />Tải lại tệp CSV</Button>
            <div className="max-h-60 overflow-y-auto">
              <DataTable>
                <thead><tr><Th>Tên đăng nhập</Th><Th>Họ tên</Th><Th>Mật khẩu tạm</Th></tr></thead>
                <tbody>{created.map((c) => <tr key={c.code}><Td className="font-mono text-[13px]">{c.code}</Td><Td>{c.fullName}</Td><Td className="font-mono text-[13px]">{c.password}</Td></tr>)}</tbody>
              </DataTable>
            </div>
            <div className="flex justify-end"><Button onClick={() => { setOpen(false); setCreated(null); }}>Đóng</Button></div>
          </div>
        ) : (
        <div className="space-y-4">
          <div className={dept ? "space-y-3" : "grid gap-5 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1.2fr)]"}>
            <div className={dept ? "space-y-3" : "flex flex-col gap-3"}>
          {dept ? (dept.isTeacher && <p className="rounded-md bg-primary-light px-3 py-2 text-sm text-primary-dark">Đây là <b>Chi đoàn giáo viên</b> (không có khối, khóa, không lên lớp cuối năm).</p>) : (
            <label className="flex cursor-pointer items-start gap-2 rounded-md border border-border bg-white/85 px-3 py-2 text-sm">
              <input type="checkbox" className="mt-0.5 size-4 accent-[#0b63b8]" checked={isTeacher} onChange={(e) => setIsTeacher(e.target.checked)} />
              <span><b>Chi đoàn giáo viên</b><span className="block text-xs text-muted">Dành cho giáo viên: không có khối/khóa, không lên lớp cuối năm, không tính vào thống kê và thi đua của học sinh. Chỉ chọn được khi tạo.</span></span>
            </label>
          )}
          <Field label="Tên Chi đoàn" required hint={isTeacher ? "Tên tùy ý, ví dụ Chi đoàn Tổ Toán – Tin hoặc Chi đoàn Giáo viên 1." : "Bắt đầu bằng khối (10, 11, 12), ví dụ 12A1 hoặc 12/1. Tên tự đổi khối theo năm học (12/1 → 11/1 → 10/1)."}><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ví dụ: 12A1 hoặc 12/1" /></Field>
          {!isTeacher && <Field label="Năm vào lớp 10 (khóa)" hint={startYear ? `Niên khóa ${cohortLabel(Number(startYear))}.` : `Tự tính theo khối trong tên (năm học hiện tại ${schoolYearStart()}–${schoolYearStart() + 1}).`}>
            <Select value={startYear} onChange={(e) => setStartYear(e.target.value)}>
              <option value="">Tự động theo tên Chi đoàn</option>
              {[...new Set([schoolYearStart() + 1, schoolYearStart(), schoolYearStart() - 1, schoolYearStart() - 2, schoolYearStart() - 3, ...(startYear ? [Number(startYear)] : [])])].sort((a, b) => b - a).map((y) => (
                <option key={y} value={y}>{y} · niên khóa {cohortLabel(y)}{y === schoolYearStart() + 1 ? " (khóa sắp vào)" : y === schoolYearStart() ? " (đang lớp 10)" : ""}</option>
              ))}
            </Select>
          </Field>}
          {dept ? <Field label="Mô tả"><Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-16" /></Field> : (
            <label className="flex flex-1 flex-col"><span className="mb-1 block text-[13px] font-medium">Mô tả</span><Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-24 flex-1 resize-none" placeholder="Ghi chú về Chi đoàn (không bắt buộc)" /></label>
          )}
            </div>
            {!dept && (
              <PeopleInput columns key={peopleKey} onChange={(v) => { setMemberText(v.doan); setYouthText(v.youth); }} />
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>Hủy</Button>
            <Button loading={busy} onClick={async () => {
              setBusy(true);
              const res = await saveDepartmentAction(dept?.id ?? null, { name, description, startYear: !isTeacher && startYear ? Number(startYear) : undefined, isTeacher, members: memberText, youth: youthText });
              setBusy(false);
              if (!reportResult(res)) return;
              router.refresh();
              if (res.data?.created?.length) { setCreated(res.data.created); downloadCsv(res.data.created, `tai-khoan-${name.trim() || "chi-doan"}-${csvStamp()}.csv`); }
              else { setOpen(false); if (!dept) { setName(""); setDescription(""); setIsTeacher(false); setMemberText(""); setYouthText(""); setPeopleKey((k) => k + 1); } }
            }}>Lưu</Button>
          </div>
        </div>
        )}
      </Modal>
    </>
  );
}

export function DeleteDepartmentButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  return (
    <ConfirmButton trigger={<Trash2 className="size-3.5" />} triggerVariant="ghost" triggerClassName="text-danger" title={`Xóa Chi đoàn ${name}?`} danger confirmLabel="Xóa"
      description="Chỉ xóa được Chi đoàn không còn đoàn viên. Các hoạt động của Chi đoàn cũng sẽ bị xóa."
      onConfirm={async () => { reportResult(await deleteDepartmentAction(id)); router.refresh(); }} />
  );
}

export function SecretaryButton({ departmentId, current, candidates }: {
  departmentId: string; current: { id: string; fullName: string; username: string } | null; candidates: { id: string; userId: string; label: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [memberId, setMemberId] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}><UserCog className="size-3.5" />{current ? "Đổi bí thư" : "Chọn bí thư"}</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Bầu bí thư Chi đoàn" className="max-w-md">
        <div className="space-y-3">
          <p className="text-sm text-muted">Chọn một đoàn viên của Chi đoàn. Tài khoản đoàn viên đó được gán thêm quyền bí thư, vẫn giữ quyền đoàn viên. Bí thư cũ trở lại là đoàn viên thường.</p>
          {current && <p className="text-sm">Bí thư hiện tại: <b>{current.fullName}</b></p>}
          {candidates.length === 0 ? <Alert tone="amber">Chi đoàn chưa có đoàn viên. Hãy thêm đoàn viên trước.</Alert> : (
            <Field label="Đoàn viên được bầu"><Select value={memberId} onChange={(e) => setMemberId(e.target.value)}><option value="">Chọn...</option>{candidates.map((c) => <option key={c.id} value={c.id} disabled={c.userId === current?.id}>{c.label}{c.userId === current?.id ? " (đang là bí thư)" : ""}</option>)}</Select></Field>
          )}
          <div className="flex justify-between gap-2 pt-1">
            <div>{current && <ConfirmButton trigger="Gỡ chức bí thư" triggerVariant="ghost" triggerClassName="text-danger" title="Gỡ chức bí thư?" description="Tài khoản vẫn là đoàn viên của Chi đoàn." danger confirmLabel="Gỡ"
              onConfirm={async () => { reportResult(await removeSecretaryAction(departmentId)); setOpen(false); router.refresh(); }} />}</div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setOpen(false)}>Hủy</Button>
              <Button loading={busy} disabled={!memberId} onClick={async () => {
                setBusy(true); const res = await assignSecretaryAction({ departmentId, memberId }); setBusy(false);
                if (reportResult(res)) { setOpen(false); setMemberId(""); router.refresh(); }
              }}>Gán bí thư</Button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}

export function SyncSchoolYearButton() {
  const router = useRouter();
  return (
    <ConfirmButton triggerVariant="secondary" trigger={<><CalendarSync className="size-4" /><span className="max-sm:hidden">Cập nhật năm học</span></>} triggerLabel="Cập nhật năm học"
      title="Cập nhật năm học?" description="Đổi tên khối theo năm học (10A1 → 11A1 → 12A1). Chi đoàn đã quá lớp 12 sẽ chuyển sang ra trường và khóa tài khoản đoàn viên, bí thư (dữ liệu được giữ). Hệ thống cũng tự làm việc này mỗi ngày."
      confirmLabel="Cập nhật" onConfirm={async () => { reportResult(await syncSchoolYearAction()); router.refresh(); }} />
  );
}

/** Thêm đoàn viên vào Chi đoàn: nhập danh sách họ tên (tự tạo tài khoản + tải CSV), thêm từng người (đủ thông tin) hoặc nhập Excel. */
export function AddMembersButton({ departmentId, departmentName }: { departmentId: string; departmentName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [youth, setYouth] = useState("");
  const [total, setTotal] = useState(0);
  const [peopleKey, setPeopleKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<Credential[] | null>(null);
  const close = () => { setOpen(false); if (created) { setCreated(null); setText(""); setYouth(""); setTotal(0); setPeopleKey((k) => k + 1); router.refresh(); } };
  const lines = total;
  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}><UserPlus className="size-4" /><span className="max-sm:hidden">Thêm thành viên</span></Button>
      <Modal open={open} onClose={close} title={`Thêm đoàn viên và thanh niên vào Chi đoàn ${departmentName}`} className="max-w-3xl">
        {created ? (
          <div className="space-y-3">
            <Alert tone="green">Đã tạo {created.length} tài khoản. <b>Mật khẩu tạm thời chỉ hiển thị một lần</b> – tệp CSV đã được tải về máy bạn, hãy bàn giao.</Alert>
            <Button variant="secondary" size="sm" onClick={() => downloadCsv(created, `tai-khoan-${departmentName}-${csvStamp()}.csv`)}><Download className="size-4" />Tải lại tệp CSV</Button>
            <div className="max-h-60 overflow-y-auto">
              <DataTable>
                <thead><tr><Th>Tên đăng nhập</Th><Th>Họ tên</Th><Th>Mật khẩu tạm</Th></tr></thead>
                <tbody>{created.map((c) => <tr key={c.code}><Td className="font-mono text-[13px]">{c.code}</Td><Td>{c.fullName}</Td><Td className="font-mono text-[13px]">{c.password}</Td></tr>)}</tbody>
              </DataTable>
            </div>
            <div className="flex justify-end"><Button onClick={close}>Đóng</Button></div>
          </div>
        ) : (
          <div className="space-y-3">
            <Field label="Danh sách học sinh" hint="Hệ thống tự tạo hồ sơ, tài khoản và tải tệp CSV mật khẩu tạm." required>
              <PeopleInput split key={peopleKey} onChange={(v) => { setText(v.doan); setYouth(v.youth); setTotal(v.total); }} />
            </Field>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="secondary" onClick={close}>Hủy</Button>
              <Button loading={busy} disabled={!lines} onClick={async () => {
                setBusy(true); const res = await addMembersToDepartmentAction(departmentId, text, youth); setBusy(false);
                if (reportResult(res) && res.data) { setCreated(res.data.created); downloadCsv(res.data.created, `tai-khoan-${departmentName}-${csvStamp()}.csv`); router.refresh(); }
              }}>Thêm {lines ? `${lines} người` : ""}</Button>
            </div>
            <p className="border-t border-border pt-3 text-xs text-muted">Cần nhập đủ ngày sinh, giới tính...? Dùng <Link href="/members/new" className="text-primary hover:underline">thêm từng đoàn viên</Link> hoặc <Link href="/members" className="text-primary hover:underline">nhập từ Excel</Link> ở mục Đoàn viên.</p>
          </div>
        )}
      </Modal>
    </>
  );
}
