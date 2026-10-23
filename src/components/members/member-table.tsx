"use client";
import { todayVN } from "@/lib/validation/rules";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Trash2, UserCheck, X } from "lucide-react";
import { toast } from "sonner";
import { admitMembersAction, deleteMembersAction } from "@/actions/members";
import { Button } from "@/components/ui/button";
import { ClickRow } from "@/components/ui/click-row";
import { Field, Input } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { Avatar, DataTable, StatusBadge, Td, Th } from "@/components/ui/misc";
import { MemberStatusBadge } from "@/components/members/member-status";
import { TypeBadge } from "@/components/members/type-badge";
import { formatDate } from "@/utils";

/** Đưa ô "Chọn tất cả" lên cùng hàng với bộ lọc (vùng #member-select-slot do FilterBar tạo); không có vùng đó thì hiện tại chỗ. */
function SelectAllSlot({ children }: { children: React.ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const find = () => document.getElementById("member-select-slot");
    const now = find();
    if (now) { setTarget(now); return; }
    // thanh lọc có thể hiện sau bảng (tải/stream muộn hơn): chờ nó xuất hiện rồi mới gắn
    const mo = new MutationObserver(() => { const el = find(); if (el) { setTarget(el); mo.disconnect(); } });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, []);
  return target ? createPortal(children, target) : <>{children}</>;
}

export type MemberRow = {
  id: string; code: string; fullName: string; avatarUrl: string | null; isDoanVien: boolean; joinedAt: string | null;
  status: "ACTIVE" | "TRANSFERRED" | "GRADUATED"; locked: boolean; activated?: boolean; department?: string; points?: number;
};

/** Bảng đoàn viên/thanh niên có ô chọn nhiều người; Admin có thể kết nạp hoặc xóa hàng loạt. */
export function MemberTable({ rows, canManage, showDepartment, showPoints, allItems }: { rows: MemberRow[]; canManage?: boolean; showDepartment?: boolean; showPoints?: boolean; /** Mọi người khớp bộ lọc (mọi trang), để chọn tất cả nhiều trang cùng lúc. */ allItems?: { id: string; isDoanVien: boolean }[] }) {
  const router = useRouter();
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [admit, setAdmit] = useState(false);
  const [del, setDel] = useState(false);
  const [joined, setJoined] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const allRef = useRef<HTMLInputElement>(null);

  const known = useMemo(() => new Map([...(allItems ?? []).map((i) => [i.id, i.isDoanVien] as const), ...rows.map((r) => [r.id, r.isDoanVien] as const)]), [allItems, rows]);
  useEffect(() => { if (!allItems) setSel((s) => new Set([...s].filter((id) => rows.some((r) => r.id === id)))); }, [rows, allItems]); // không có "chọn mọi trang" thì đổi trang là bỏ chọn
  const chosen = useMemo(() => rows.filter((r) => sel.has(r.id)), [rows, sel]); // người đang hiện trên trang (để liệt kê tên)
  const selIds = useMemo(() => [...sel], [sel]);
  const youthIds = useMemo(() => selIds.filter((id) => known.get(id) === false), [selIds, known]);
  const youth = youthIds;
  const pageAllOn = rows.length > 0 && chosen.length === rows.length;
  const allOn = pageAllOn;
  const moreTotal = allItems?.length ?? rows.length;
  const everyOn = !!allItems && sel.size >= allItems.length && allItems.every((i) => sel.has(i.id));
  useEffect(() => { if (allRef.current) allRef.current.indeterminate = chosen.length > 0 && !allOn; }, [chosen.length, allOn]);
  const selectEveryone = () => setSel(new Set(allItems!.map((i) => i.id)));

  const toggle = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const cols = 4 + (canManage ? 1 : 0) + (showDepartment ? 1 : 0) + (showPoints ? 1 : 0);
  const done = () => { setSel(new Set()); router.refresh(); };

  return (
    <>
      {canManage && (
        <div className="mb-2 space-y-1.5 empty:hidden">
          <SelectAllSlot>
          <label className="inline-flex h-9 cursor-pointer max-sm:hidden items-center gap-2 whitespace-nowrap rounded-md border border-border bg-white px-3 text-sm font-medium hover:bg-slate-50">
            <input type="checkbox" className="size-4 accent-[#0b63b8]" checked={allOn} onChange={() => setSel(allOn ? new Set() : new Set(rows.map((r) => r.id)))} />
            Chọn tất cả {rows.length}
          </label>
          </SelectAllSlot>
          {allItems && allOn && !everyOn && allItems.length > rows.length && (
            <p className="rounded-md bg-amber-50 px-3 py-1.5 text-sm text-amber-900">Đã chọn {rows.length} người trên trang này. <button type="button" onClick={selectEveryone} className="font-semibold text-primary underline">Chọn tất cả {allItems.length} người</button> ở mọi trang.</p>
          )}
          {sel.size > 0 && (
            <div className="sticky top-14 z-10 flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary-light px-3 py-2 text-sm shadow-sm">
              <span className="font-semibold text-primary-dark">Đã chọn {sel.size} người{youth.length > 0 && <span className="font-normal text-slate-600"> · {youth.length} thanh niên</span>}{everyOn && <span className="font-normal text-slate-600"> (toàn bộ danh sách)</span>}</span>
              <span className="ml-auto flex flex-wrap items-center gap-2">
                <Button size="sm" disabled={youth.length === 0} title={youth.length === 0 ? "Chỉ kết nạp được thanh niên (chưa vào Đoàn)" : undefined} onClick={() => setAdmit(true)}><UserCheck className="size-3.5" />Kết nạp vào Đoàn{youth.length > 0 && ` (${youth.length})`}</Button>
                <Button size="sm" variant="danger" onClick={() => setDel(true)}><Trash2 className="size-3.5" />Xóa ({sel.size})</Button>
                <Button size="sm" variant="ghost" onClick={() => setSel(new Set())}><X className="size-3.5" />Bỏ chọn</Button>
              </span>
            </div>
          )}
        </div>
      )}
      <DataTable>
        <thead><tr>
          {canManage && <Th className="w-10"><input ref={allRef} type="checkbox" className="size-4 accent-[#0b63b8]" aria-label="Chọn tất cả trên trang" checked={allOn} onChange={() => setSel(allOn ? new Set() : new Set(rows.map((r) => r.id)))} /></Th>}
          <Th>Mã đoàn viên</Th><Th>Họ tên</Th>{showDepartment && <Th>Chi đoàn</Th>}<Th>Loại</Th><Th>Ngày vào Đoàn</Th><Th>Trạng thái</Th>{showPoints && <Th className="text-right">Điểm</Th>}
        </tr></thead>
        <tbody>
          {rows.length === 0 && <tr><Td colSpan={cols} className="py-6 text-center text-muted">Không có ai</Td></tr>}
          {rows.map((m) => (
            <ClickRow key={m.id} href={`/members/${m.id}`} className={sel.has(m.id) ? "bg-primary-light/60" : undefined}>
              {canManage && <Td className="w-10"><input type="checkbox" className="size-4 accent-[#0b63b8]" aria-label={`Chọn ${m.fullName}`} checked={sel.has(m.id)} onChange={() => toggle(m.id)} /></Td>}
              <Td className="font-mono text-[13px]">{m.code}</Td>
              <Td><Link href={`/members/${m.id}`} className="flex items-center gap-2 font-medium hover:text-primary"><Avatar name={m.fullName} src={m.avatarUrl} size={28} />{m.fullName}</Link></Td>
              {showDepartment && <Td>{m.department}</Td>}
              <Td><TypeBadge doanVien={m.isDoanVien} /></Td>
              <Td className="whitespace-nowrap">{m.isDoanVien ? (m.joinedAt ? formatDate(m.joinedAt) : "—") : <span className="text-muted">Chưa vào Đoàn</span>}</Td>
              <Td><span className="inline-flex flex-wrap items-center gap-1.5"><MemberStatusBadge status={m.status} locked={m.locked} />{m.activated === false && <StatusBadge tone="amber">Chưa kích hoạt</StatusBadge>}</span></Td>
              {showPoints && <Td className="text-right tabular-nums">{m.points ?? 0}</Td>}
            </ClickRow>
          ))}
        </tbody>
      </DataTable>

      <Modal open={admit} onClose={() => setAdmit(false)} title="Kết nạp vào Đoàn" className="max-w-sm">
        <div className="space-y-3">
          <p className="text-sm text-slate-600">Kết nạp <b>{youth.length} thanh niên</b> đã chọn vào Đoàn TNCS Hồ Chí Minh. Họ trở thành <b>đoàn viên</b> và nhận thông báo chúc mừng.{sel.size > youth.length && <> ({sel.size - youth.length} người đã là đoàn viên sẽ được bỏ qua.)</>}</p>
          <Field label="Ngày vào Đoàn"><Input type="date" min="1990-01-01" max={todayVN()} value={joined} onChange={(e) => setJoined(e.target.value)} /></Field>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setAdmit(false)}>Hủy</Button>
            <Button loading={busy} onClick={async () => { setBusy(true); const r = await admitMembersAction(youthIds, joined); setBusy(false); if (!r.ok) return void toast.error(r.error); toast.success(r.message); setAdmit(false); done(); }}>Kết nạp {youth.length} người</Button>
          </div>
        </div>
      </Modal>

      <Modal open={del} onClose={() => setDel(false)} title={`Xóa ${sel.size} người?`} className="max-w-md">
        <div className="space-y-3">
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">Toàn bộ hồ sơ, tài khoản, lịch sử điểm danh và điểm của những người này sẽ bị xóa <b>vĩnh viễn, không khôi phục được</b>.</p>
          <ul className="max-h-40 overflow-y-auto rounded-md border border-border px-3 py-2 text-sm">{chosen.map((c) => <li key={c.id} className="flex justify-between gap-2"><span className="truncate">{c.fullName}</span><span className="shrink-0 font-mono text-xs text-muted">{c.code}</span></li>)}{sel.size > chosen.length && <li className="pt-1 text-xs text-muted">… và {sel.size - chosen.length} người ở các trang khác</li>}</ul>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDel(false)}>Hủy</Button>
            <Button variant="danger" loading={busy} onClick={async () => { setBusy(true); const r = await deleteMembersAction(selIds); setBusy(false); if (!r.ok) return void toast.error(r.error); toast.success(r.message); setDel(false); done(); }}>Xóa {sel.size} người</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
