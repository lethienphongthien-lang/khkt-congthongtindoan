"use client";
import { useEffect, useMemo, useState } from "react";
import { useT } from "@/lib/i18n/client";
import { Textarea } from "@/components/ui/form";
import { cn } from "@/utils";

/** Tách danh sách họ tên (mỗi dòng một người), bỏ trùng không phân biệt hoa thường. */
export function parseLines(text: string): string[] {
  const seen = new Set<string>(); const out: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const n = raw.trim().replace(/^\d+\s*[.)\-:]?\s+/, "").replace(/\s+/g, " "); // bỏ số thứ tự dán kèm từ Excel: "12 Nguyễn Văn A", "3. Trần B"
    if (!n || seen.has(n.toLowerCase())) continue;
    seen.add(n.toLowerCase()); out.push(n);
  }
  return out;
}

/**
 * Nhập danh sách học sinh của Chi đoàn: gõ hoặc dán họ tên (mỗi dòng một người), mỗi người hiện một dòng với nút gạt
 * "Đoàn viên / Thanh niên". Trả về hai danh sách (đoàn viên, thanh niên) cho máy chủ.
 */
export function PeopleInput({ onChange, className, split, columns }: { onChange: (v: { doan: string; youth: string; total: number }) => void; className?: string; /** Rộng: nhập bên trái, danh sách bên phải. */ split?: boolean; /** Trả hai cột (nhập, danh sách) trực tiếp vào lưới của phần tử cha. */ columns?: boolean }) {
  const t = useT();
  const [text, setText] = useState("");
  const [defaultDoan, setDefaultDoan] = useState(true);
  const [overrides, setOverrides] = useState<Record<string, boolean>>({}); // họ tên (chữ thường) -> true: đoàn viên
  const names = useMemo(() => parseLines(text), [text]);
  const isDoan = (n: string) => overrides[n.toLowerCase()] ?? defaultDoan;
  const doan = names.filter(isDoan), youth = names.filter((n) => !isDoan(n));

  useEffect(() => { if (names.length === 0 && (!defaultDoan || Object.keys(overrides).length)) { setDefaultDoan(true); setOverrides({}); } }, [names.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { onChange({ doan: doan.join("\n"), youth: youth.join("\n"), total: names.length }); }, [names, defaultDoan, overrides]); // eslint-disable-line react-hooks/exhaustive-deps

  const wide = split || columns;
  return (
    <div className={cn(columns ? "contents" : split ? "grid gap-3 md:grid-cols-2" : "space-y-2", className)}>
      <div className="space-y-1">
        {columns && <div className="text-[13px] font-medium">{t("pi.names")} <span className="font-normal text-muted">({t("pi.optional")})</span></div>}
        <Textarea value={text} onChange={(e) => setText(e.target.value)} className={wide ? "h-[42vh] min-h-72 resize-none" : "min-h-32"} placeholder={t("pi.ph")} />
        <p className="text-xs text-muted">{t("pi.hint")}</p>
      </div>
      <div className="min-w-0 space-y-2">
        {columns && <div className="text-[13px] font-medium">{t("pi.classify")}</div>}
        {names.length === 0 ? (
          <div className="flex h-full min-h-24 items-center justify-center rounded-lg border border-dashed border-border bg-slate-50/60 p-4 text-center text-sm text-muted">{t("pi.empty")}</div>
        ) : (
          <>
            <div className="text-sm font-medium"><span className="text-emerald-700">{t("pi.nDoan", { n: doan.length })}</span> · <span className="text-amber-700">{t("mt.nYouth", { n: youth.length })}</span></div>
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-muted">{t("pi.setAll")}</span>
              <button type="button" onClick={() => { setDefaultDoan(true); setOverrides({}); }} className={cn("rounded-full border px-2.5 py-0.5", doan.length === names.length ? "border-emerald-600 bg-emerald-600 text-white" : "border-border hover:bg-slate-50")}>{t("pi.allDoan")}</button>
              <button type="button" onClick={() => { setDefaultDoan(false); setOverrides({}); }} className={cn("rounded-full border px-2.5 py-0.5", youth.length === names.length ? "border-amber-500 bg-amber-500 text-white" : "border-border hover:bg-slate-50")}>{t("pi.allYouth")}</button>
            </div>
            <ul className={cn("divide-y divide-border overflow-y-auto rounded-lg border border-border bg-white", wide ? "max-h-[42vh]" : "max-h-64")}>
              {names.map((n, i) => {
                const d = isDoan(n);
                return (
                  <li key={n} className="flex items-center gap-2 px-2 py-1.5 text-sm">
                    <span className="w-6 shrink-0 text-right text-xs text-muted">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate">{n}</span>
                    <span className="inline-flex shrink-0 overflow-hidden rounded-md border border-border text-xs font-medium">
                      <button type="button" onClick={() => setOverrides({ ...overrides, [n.toLowerCase()]: true })} className={cn("px-2 py-1", d ? "bg-emerald-600 text-white" : "bg-white text-slate-500 hover:bg-slate-50")}>{t("members.doanVien")}</button>
                      <button type="button" onClick={() => setOverrides({ ...overrides, [n.toLowerCase()]: false })} className={cn("px-2 py-1", !d ? "bg-amber-500 text-white" : "bg-white text-slate-500 hover:bg-slate-50")}>{t("members.youth")}</button>
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="text-xs text-muted">{t("pi.youthNote")}</p>
          </>
        )}
      </div>
    </div>
  );
}
