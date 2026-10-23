"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/utils";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();

/** Ô chọn có tìm kiếm: gõ để lọc (không cần gõ dấu), ↑ ↓ để di chuyển, Enter để chọn, Esc để đóng. */
export function SearchSelect({ value, options, onChange, placeholder = "Chọn…", disabled, className }: {
  value: string; options: string[]; onChange: (v: string) => void; placeholder?: string; disabled?: boolean; className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const all = useMemo(() => (value && !options.includes(value) ? [value, ...options] : options), [value, options]);
  const shown = useMemo(() => { const q = norm(text.trim()); return q ? all.filter((o) => norm(o).includes(q)) : all; }, [all, text]);

  useEffect(() => {
    if (!open) return;
    const off = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", off);
    return () => document.removeEventListener("mousedown", off);
  }, [open]);
  useEffect(() => { list.current?.children[active]?.scrollIntoView({ block: "nearest" }); }, [active, open]);

  const pick = (v: string) => { onChange(v); setOpen(false); setText(""); };
  return (
    <div ref={root} className={cn("relative", className)}>
      <input
        type="text" role="combobox" aria-expanded={open} disabled={disabled} autoComplete="off"
        value={open ? text : value} placeholder={value && open ? value : placeholder}
        onFocus={() => { setOpen(true); setText(""); setActive(Math.max(0, all.indexOf(value))); }}
        onChange={(e) => { setText(e.target.value); setActive(0); setOpen(true); }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((a) => Math.min(shown.length - 1, a + 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
          else if (e.key === "Enter" && open) { e.preventDefault(); if (shown[active]) pick(shown[active]); }
          else if (e.key === "Escape" || e.key === "Tab") setOpen(false);
        }}
        className="h-9 w-full rounded-md border border-border bg-white/85 pr-14 pl-3 text-sm placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-slate-50 disabled:text-muted"
      />
      <span className="absolute inset-y-0 right-2 flex items-center gap-1 text-slate-400">
        {value && !disabled && <button type="button" tabIndex={-1} aria-label="Xóa lựa chọn" onClick={() => pick("")} className="rounded p-0.5 hover:text-slate-700"><X className="size-3.5" /></button>}
        <ChevronDown className="pointer-events-none size-4" />
      </span>
      {open && (
        <ul ref={list} role="listbox" className="absolute z-40 mt-1 max-h-60 w-full min-w-48 overflow-y-auto rounded-md border border-border bg-white p-1 text-sm shadow-lg">
          {shown.length === 0 && <li className="px-2 py-1.5 text-muted">Không tìm thấy</li>}
          {shown.map((o, i) => (
            <li key={o} role="option" aria-selected={o === value} onMouseDown={(e) => { e.preventDefault(); pick(o); }} onMouseEnter={() => setActive(i)}
              className={cn("flex cursor-pointer items-center justify-between gap-2 rounded px-2 py-1.5", i === active && "bg-primary-light", o === value && "font-medium text-primary")}>
              <span className="truncate">{o}</span>{o === value && <Check className="size-3.5 shrink-0" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
