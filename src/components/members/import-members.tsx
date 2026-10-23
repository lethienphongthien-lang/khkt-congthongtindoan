"use client";
import { useRef, useState, useTransition } from "react";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { toast } from "sonner";
import { importMembersAction, type ImportResult } from "@/actions/members";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Alert, DataTable, Td, Th } from "@/components/ui/misc";
import { csvStamp, downloadCsv } from "@/components/members/credentials";
import { useRouter } from "next/navigation";

export function ImportMembersButton() {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [pending, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const close = () => { if (pending) return; setOpen(false); setFile(null); setResult(null); if (result?.created.length) router.refresh(); };

  const submit = () => start(async () => {
    if (!file) return;
    const fd = new FormData();
    fd.set("file", file);
    const res = await importMembersAction(fd);
    if (!res.ok) return void toast.error(res.error);
    setResult(res.data!);
    if (res.data!.created.length) { toast.success(res.message); downloadCsv(res.data!.created, `tai-khoan-doan-vien-${csvStamp()}.csv`); }
  });

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}><Upload className="size-4" />Nhập<span className="max-sm:hidden"> Excel</span></Button>
      <Modal open={open} onClose={close} title="Nhập đoàn viên từ Excel" className="max-w-2xl">
        {!result ? (
          <div className="space-y-4">
            <p className="text-sm text-muted">Tải file mẫu, điền danh sách rồi tải lên. Hệ thống tự sinh mã đoàn viên và tạo tài khoản với mật khẩu tạm thời.</p>
            <a href="/api/members/template" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"><Download className="size-4" />Tải file mẫu (.xlsx)</a>
            <input ref={input} type="file" accept=".xlsx" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <button onClick={() => input.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-border py-8 text-sm text-muted hover:bg-slate-50">
              <FileSpreadsheet className="size-5" />{file ? file.name : "Chọn file .xlsx"}
            </button>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={close}>Hủy</Button>
              <Button onClick={submit} loading={pending} disabled={!file}>Nhập dữ liệu</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {result.created.length > 0 && (
              <>
                <Alert tone="green">Đã tạo {result.created.length} tài khoản. <b>Mật khẩu tạm thời chỉ hiển thị một lần</b> – hãy tải về và bàn giao cho đoàn viên.</Alert>
                <Button variant="secondary" size="sm" onClick={() => downloadCsv(result.created, "tai-khoan-doan-vien.csv")}><Download className="size-4" />Tải danh sách tài khoản (CSV)</Button>
                <div className="max-h-56 overflow-y-auto">
                  <DataTable>
                    <thead><tr><Th>Mã / Tên đăng nhập</Th><Th>Họ tên</Th><Th>Mật khẩu tạm</Th></tr></thead>
                    <tbody>{result.created.map((c) => <tr key={c.code}><Td className="font-mono text-[13px]">{c.code}</Td><Td>{c.fullName}</Td><Td className="font-mono text-[13px]">{c.password}</Td></tr>)}</tbody>
                  </DataTable>
                </div>
              </>
            )}
            {result.errors.length > 0 && (
              <>
                <Alert tone="amber">{result.errors.length} dòng bị bỏ qua:</Alert>
                <ul className="max-h-40 list-disc space-y-0.5 overflow-y-auto pl-5 text-sm">{result.errors.map((e) => <li key={e.row}>Dòng {e.row}: {e.message}</li>)}</ul>
              </>
            )}
            <div className="flex justify-end"><Button onClick={close}>Xong</Button></div>
          </div>
        )}
      </Modal>
    </>
  );
}
