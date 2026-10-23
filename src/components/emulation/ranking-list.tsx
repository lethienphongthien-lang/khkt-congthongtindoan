"use client";
import Link from "next/link";
import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { buttonClass } from "@/components/ui/button";

export type RankItem = {
  id: string; rank: number; name: string; members: number; schoolScore: number; total: number; mine: boolean; canOpen: boolean;
};

/** Danh sách gọn cho mobile: chỉ hạng, tên, tổng điểm; bấm để xem chi tiết trong hộp thoại. */
export function RankingList({ items }: { items: RankItem[] }) {
  const [sel, setSel] = useState<RankItem | null>(null);
  const max = Math.max(1, ...items.map((i) => Math.abs(i.total)));
  const rows: [string, React.ReactNode][] = sel ? [
    ["Hạng", sel.rank], ["Số đoàn viên", sel.members],
    ["Điểm thi đua", <b key="t">{sel.total}</b>],
  ] : [];
  return (
    <>
      <ul className="divide-y divide-border rounded-lg border border-border bg-white/85 sm:hidden">
        {items.map((r) => (
          <li key={r.id}>
            <button onClick={() => setSel(r)} className={`block w-full px-3 py-2.5 text-left ${r.mine ? "bg-primary-light/50" : ""}`}>
              <div className="flex items-center gap-3">
                <span className={`flex size-7 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold ${r.rank <= 3 ? "bg-primary text-white" : "bg-slate-100 text-slate-600"}`}>{r.rank}</span>
                <span className="min-w-0 flex-1 truncate font-medium">Chi đoàn {r.name}</span>
                <span className="text-lg font-semibold tabular-nums">{r.total}</span>
              </div>
              <div className="mt-2 ml-10 h-1 overflow-hidden rounded-full bg-slate-100"><div className={`h-full ${r.total < 0 ? "bg-danger" : "bg-primary"}`} style={{ width: `${(Math.abs(r.total) / max) * 100}%` }} /></div>
            </button>
          </li>
        ))}
      </ul>
      <Modal open={!!sel} onClose={() => setSel(null)} title={sel ? `Chi đoàn ${sel.name}` : ""} className="max-w-sm">
        <dl className="divide-y divide-border text-sm">
          {rows.map(([k, v]) => <div key={k} className="flex justify-between gap-4 py-2"><dt className="text-muted">{k}</dt><dd className="text-right tabular-nums">{v}</dd></div>)}
        </dl>
        {sel?.canOpen && <Link href={`/departments/${sel.id}`} className={buttonClass("secondary", "md", "mt-4 w-full")}>Xem Chi đoàn</Link>}
      </Modal>
    </>
  );
}
