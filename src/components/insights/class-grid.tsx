"use client";
import { useState } from "react";
import { cn } from "@/utils";

export type GridMetric = { key: string; label: string; unit?: string; agg: "sum" | "avg" };
export type GridRow = { id: string; name: string; values: Record<string, number> };

const fmt = (n: number) => n.toLocaleString("vi-VN", { maximumFractionDigits: 1 });
const gradeOf = (name: string) => (/^(\d{2})/.exec(name)?.[1] ? `Khối ${/^(\d{2})/.exec(name)![1]}` : "Khác");

/** Lưới ô theo từng lớp, gom theo khối; chọn chỉ số bằng nút. Ô càng đậm màu thì chỉ số càng cao. */
export function ClassGrid({ rows, metrics }: { rows: GridRow[]; metrics: GridMetric[] }) {
  const [key, setKey] = useState(metrics[0].key);
  const m = metrics.find((x) => x.key === key)!;
  const max = Math.max(...rows.map((r) => r.values[key] ?? 0), 1);
  const groups = [...new Set(rows.map((r) => gradeOf(r.name)))].sort();
  const unit = m.unit ?? "";
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {metrics.map((x) => (
          <button key={x.key} type="button" onClick={() => setKey(x.key)}
            className={cn("rounded-full border px-3 py-1 text-sm font-medium transition", x.key === key ? "border-primary bg-primary text-white" : "border-border bg-white text-slate-700 hover:bg-primary-light")}>{x.label}</button>
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        {groups.map((g) => {
          const list = rows.filter((r) => gradeOf(r.name) === g);
          const vals = list.map((r) => r.values[key] ?? 0);
          const total = vals.reduce((s, v) => s + v, 0);
          const sum = m.agg === "sum" ? total : total / (vals.length || 1);
          return (
            <div key={g} className="rounded-lg border border-border bg-white/90 p-3 shadow-sm">
              <div className="mb-2 flex items-end justify-between">
                <div className="font-semibold text-primary-dark">{g}</div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-primary tabular-nums">{fmt(sum)}</span><span className="text-sm text-muted">{unit}</span>
                  <div className="text-[11px] text-muted">{m.agg === "sum" ? "tổng" : "trung bình"}</div>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {list.map((r) => {
                  const v = r.values[key] ?? 0, p = v / max;
                  return (
                    <div key={r.id} title={`${r.name}: ${fmt(v)}${unit}`} className="rounded px-1 py-1.5 text-center"
                      style={{ background: v > 0 ? `rgba(11,99,184,${0.12 + p * 0.78})` : "#f1f5f9", color: p > 0.5 ? "#fff" : "#0f172a" }}>
                      <div className="text-[11px] leading-tight opacity-80">{r.name}</div>
                      <div className="text-sm font-bold tabular-nums">{fmt(v)}<span className="text-[10px] font-medium">{unit}</span></div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
