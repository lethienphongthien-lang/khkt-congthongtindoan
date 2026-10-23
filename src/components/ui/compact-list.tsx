"use client";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/utils";
import { buttonClass } from "./button";
import { Modal } from "./modal";

export type CompactItem = {
  id: string;
  rank?: number;
  title: string;
  subtitle?: string;
  /** Giá trị nổi bật bên phải (điểm, tỷ lệ...). */
  value?: React.ReactNode;
  badge?: React.ReactNode;
  leading?: React.ReactNode;
  highlight?: boolean;
  /** Thông tin đầy đủ hiển thị trong hộp thoại khi bấm vào dòng. */
  details?: [string, React.ReactNode][];
  /** Có href: bấm vào dòng đi thẳng tới trang chi tiết (không mở hộp thoại). */
  href?: string;
  hrefLabel?: string;
  /** Nút thao tác (sửa/xóa...) đặt trong hộp thoại. */
  actions?: React.ReactNode;
};

/** Danh sách gọn cho mobile (ẩn từ sm trở lên). Ghép với bảng bọc trong `max-sm:hidden`. */
export function CompactList({ items }: { items: CompactItem[] }) {
  const [sel, setSel] = useState<CompactItem | null>(null);
  return (
    <>
      <ul className="divide-y divide-border rounded-lg border border-border bg-white/85 sm:hidden">
        {items.map((it) => (
          <li key={it.id}>
            <Row it={it} onSelect={() => setSel(it)}>
              <>
              {it.rank !== undefined && (
                <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold", it.rank <= 3 ? "bg-primary text-white" : "bg-slate-100 text-slate-600")}>{it.rank}</span>
              )}
              {it.leading}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{it.title}</span>
                {it.subtitle && <span className="block truncate text-xs text-muted">{it.subtitle}</span>}
              </span>
              {it.badge}
              {it.value !== undefined && <span className="font-semibold tabular-nums">{it.value}</span>}
              </>
            </Row>
          </li>
        ))}
      </ul>
      <Modal open={!!sel} onClose={() => setSel(null)} title={sel?.title ?? ""} className="max-w-sm">
        {sel && (
          <>
            {sel.details && (
              <dl className="divide-y divide-border text-sm">
                {sel.details.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 py-2"><dt className="shrink-0 text-muted">{k}</dt><dd className="min-w-0 text-right break-words">{v}</dd></div>
                ))}
              </dl>
            )}
            {(sel.href || sel.actions) && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {sel.href && <Link href={sel.href} className={buttonClass("primary", "md", "flex-1 whitespace-nowrap")}>{sel.hrefLabel ?? "Xem chi tiết"}</Link>}
                {sel.actions}
              </div>
            )}
          </>
        )}
      </Modal>
    </>
  );
}

function Row({ it, onSelect, children }: { it: CompactItem; onSelect: () => void; children: React.ReactNode }) {
  const cls = cn("flex w-full items-center gap-3 px-3 py-2.5 text-left", it.highlight && "bg-primary-light/50");
  return it.href ? <Link href={it.href} className={cls}>{children}</Link> : <button onClick={onSelect} className={cls}>{children}</button>;
}
