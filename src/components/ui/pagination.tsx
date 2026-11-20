"use client";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useT } from "@/lib/i18n/client";

export function Pagination({ page, pageSize, total, basePath, params }: {
  page: number; pageSize: number; total: number; basePath: string; params: Record<string, string | undefined>;
}) {
  const t = useT();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const href = (p: number) => {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v && sp.set(k, v));
    sp.set("page", String(p));
    return `${basePath}?${sp}`;
  };
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  // trang đầu, trang cuối và 2 trang mỗi bên trang hiện tại; chỗ bị bỏ qua hiện dấu …
  const nums = [...new Set([1, ...Array.from({ length: 5 }, (_, i) => page - 2 + i), pages])].filter((n) => n >= 1 && n <= pages).sort((x, y) => x - y);
  const items: (number | "gap")[] = [];
  nums.forEach((n, i) => { if (i > 0 && n - nums[i - 1] > 1) items.push("gap"); items.push(n); });
  const box = "inline-flex h-7 min-w-7 items-center justify-center rounded-md border px-1.5 text-[13px]";
  const idle = `${box} border-border bg-white/85 text-foreground hover:bg-slate-100`;
  const off = `${box} border-border bg-white/85 opacity-40`;
  return (
    <>
    <div className="pager-spacer" aria-hidden />
    <div className="pager mt-3 flex items-center justify-between text-[13px] text-muted">
      <span>{from}–{Math.min(page * pageSize, total)} / {total}</span>
      <div className="flex items-center gap-1">
        {page > 1 ? <Link href={href(page - 1)} aria-label={t("ui.prevPage")} className={idle}><ChevronLeft className="size-4" /></Link>
          : <span className={off}><ChevronLeft className="size-4" /></span>}
        {items.map((n, i) => n === "gap" ? <span key={`g${i}`} className="px-1">…</span>
          : n === page ? <span key={n} aria-current="page" className={`${box} border-primary bg-primary font-semibold text-white`}>{n}</span>
          : <Link key={n} href={href(n)} className={idle}>{n}</Link>)}
        {page < pages ? <Link href={href(page + 1)} aria-label={t("ui.nextPage")} className={idle}><ChevronRight className="size-4" /></Link>
          : <span className={off}><ChevronRight className="size-4" /></span>}
      </div>
    </div>
    </>
  );
}
