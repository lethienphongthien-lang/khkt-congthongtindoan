"use client";
import { useState } from "react";
import { KeyRound } from "lucide-react";
import { resetDepartmentPasswordsAction } from "@/actions/members";
import { Field, Select } from "@/components/ui/form";
import { ConfirmButton } from "@/components/ui/modal";
import { Alert } from "@/components/ui/misc";
import { reportResult } from "@/components/ui/submit";
import { csvStamp, downloadCsv } from "@/components/members/credentials";
import type { Credential } from "@/actions/members";

/** Admin cấp lại mật khẩu tạm thời cho cả một lớp (Chi đoàn) và tự tải tệp CSV danh sách mật khẩu. */
export function ClassPasswordManager({ classes }: { classes: { id: string; name: string; count: number }[] }) {
  const [id, setId] = useState("");
  const [last, setLast] = useState<{ name: string; rows: Credential[] } | null>(null);
  const cur = classes.find((c) => c.id === id);
  return (
    <div className="max-w-xl space-y-4">
      <p className="text-sm text-muted">Cấp mật khẩu tạm thời mới cho tất cả tài khoản đang hoạt động của một lớp. Hệ thống tự tải tệp CSV danh sách mật khẩu; mật khẩu chỉ hiện một lần nên hãy lưu tệp lại. Mỗi người phải đổi mật khẩu khi đăng nhập lại, và các thiết bị đăng nhập nhanh của họ bị thu hồi.</p>
      <Field label="Lớp (Chi đoàn)">
        <Select value={id} onChange={(e) => { setId(e.target.value); setLast(null); }}>
          <option value="">Chọn lớp</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.count} tài khoản)</option>)}
        </Select>
      </Field>
      {cur && (
        <ConfirmButton trigger={<><KeyRound className="size-4" />Cấp lại mật khẩu cả lớp {cur.name}</>} title={`Cấp lại mật khẩu cho lớp ${cur.name}?`} danger confirmLabel="Cấp lại"
          description={`${cur.count} tài khoản sẽ bị đổi mật khẩu ngay, mật khẩu cũ không dùng được nữa.`}
          onConfirm={async () => {
            const res = await resetDepartmentPasswordsAction(cur.id);
            if (reportResult(res) && res.data) { setLast({ name: cur.name, rows: res.data.rows }); downloadCsv(res.data.rows, `mat-khau-${cur.name}-${csvStamp()}.csv`); }
          }} />
      )}
      {last && <Alert tone="green">Đã cấp lại mật khẩu cho {last.rows.length} tài khoản lớp {last.name} và tải tệp CSV về máy. Nếu chưa thấy tệp, <button className="font-semibold underline" onClick={() => downloadCsv(last.rows, `mat-khau-${last.name}-${csvStamp()}.csv`)}>tải lại tại đây</button> (chỉ còn trong lần mở trang này).</Alert>}
    </div>
  );
}
