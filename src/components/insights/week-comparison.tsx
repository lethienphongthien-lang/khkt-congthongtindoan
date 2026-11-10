"use client";

import { useState } from "react";
import type { MetricKey, WeekRow } from "@/lib/services/insights";
import { BarChart } from "./bar-chart";

const dateLabel = (day: string) => day.split("-").reverse().join("/");
export function WeekComparison({ rows, metrics, simulatedWeeks }: {
  rows: WeekRow[];
  metrics: { key: MetricKey; label: string; unit: string; hint: string }[];
  simulatedWeeks: string[];
}) {
  const [selected, setSelected] = useState(rows.slice(-3).map((r) => r.start));
  const chosen = rows.filter((r) => selected.includes(r.start));
  return <section className="mt-6">
    <h2 className="text-lg font-semibold">So sánh giữa các tuần</h2>
    <p className="my-2 text-sm text-muted">Chọn từ 2 đến 6 tuần. Tuần hiện tại chưa đủ 7 ngày; các chỉ số dùng thang đo riêng.</p>
    <fieldset className="mb-5 flex flex-wrap gap-2">
      <legend className="sr-only">Các tuần cần so sánh</legend>
      {rows.map((row) => <label key={row.start} className="flex items-center gap-2 rounded border border-border bg-white/90 px-3 py-2 text-sm">
        <input type="checkbox" checked={selected.includes(row.start)} disabled={!selected.includes(row.start) && selected.length >= 6}
          onChange={() => setSelected((prev) => prev.includes(row.start) ? prev.filter((s) => s !== row.start) : [...prev, row.start])} />
        {dateLabel(row.start)}{row.label === "Tuần này" ? " (tuần này)" : ""}{simulatedWeeks.includes(row.start) ? " · mô phỏng" : ""}
      </label>)}
    </fieldset>
    {chosen.length < 2 ? <p role="status" className="rounded border border-border p-4">Chọn ít nhất 2 tuần để so sánh.</p> : <div className="grid gap-4 lg:grid-cols-2">
      {metrics.map((metric) => {
        const previous = chosen[chosen.length - 2][metric.key];
        const latest = chosen[chosen.length - 1][metric.key];
        const difference = metric.unit === "%" ? latest - previous : previous ? (latest - previous) / previous * 100 : null;
        return <div key={metric.key} className="rounded-lg border border-border border-t-4 border-t-primary bg-white/90 p-4 shadow-sm">
          <h3 className="font-semibold text-primary-dark">{metric.label}{metric.unit ? ` (${metric.unit})` : ""}</h3>
          <p className="mb-2 text-xs text-muted">{metric.hint}</p>
          <BarChart labels={chosen.map((r) => `${r.start.slice(8)}/${r.start.slice(5, 7)}`)} values={chosen.map((r) => r[metric.key])} unit={metric.unit} />
          <p className="mt-2 text-xs text-muted">Hai tuần được chọn gần nhất: {difference === null ? "chưa có cơ sở tính % thay đổi" : `${difference >= 0 ? "+" : ""}${difference.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}${metric.unit === "%" ? " điểm %" : "%"}`}.</p>
          <table className="mt-2 w-full text-sm"><caption className="sr-only">Giá trị {metric.label} theo tuần</caption><thead><tr><th className="text-left">Tuần bắt đầu</th><th className="text-right">Giá trị</th></tr></thead><tbody>{chosen.map((r) => <tr key={r.start}><td>{dateLabel(r.start)}{simulatedWeeks.includes(r.start) ? " (mô phỏng)" : ""}</td><td className="text-right tabular-nums">{r[metric.key].toLocaleString("vi-VN", { maximumFractionDigits: 1 })}{metric.unit ? ` ${metric.unit}` : ""}</td></tr>)}</tbody></table>
        </div>;
      })}
    </div>}
  </section>;
}
