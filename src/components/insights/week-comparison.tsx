"use client";

import { useState } from "react";
import { ArrowDownRight, ArrowLeftRight, ArrowUpRight, CalendarDays, Minus } from "lucide-react";
import { useLocale, useT } from "@/lib/i18n/client";
import { intlLocale } from "@/lib/i18n/format";
import type { TFn } from "@/lib/i18n/translate";
import type { MetricKey, WeekRow } from "@/lib/services/insights";

type Fmt = (n: number) => string;
const signed = (n: number, fmt: Fmt) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${fmt(Math.abs(n))}`;
const dateLabel = (day: string) => day.split("-").reverse().join("/");
const weekLabel = (row: WeekRow, t: TFn) => `${dateLabel(row.start)}${row.label === "Tuần này" ? t("dash.cmp.ongoing") : ""}`;
const unitOf = (u: string, t: TFn) => (u === "điểm" ? t("dash.unit.points").trim() : u);

type Metric = { key: MetricKey; label: string; unit: string; hint: string };
type ComparedMetric = Metric & { base: number; target: number; delta: number; percent: number | null };

/** Mọi chỉ số dùng cùng trục phần trăm; không biến mẫu số 0 thành 0% tăng trưởng. */
function ChangeChart({ items, t, fmt }: { items: ComparedMetric[]; t: TFn; fmt: Fmt }) {
  const max = Math.max(10, ...items.map((m) => Math.abs(m.percent ?? 0)));
  const origin = 390, half = 155, height = items.length * 40 + 48;
  return <div className="overflow-x-auto">
    <svg viewBox={`0 0 720 ${height}`} className="mx-auto block h-auto w-full min-w-[480px] max-w-[720px]" role="img" aria-label={t("dash.cmp.chartAria")}>
      <text x={origin - half} y="17" textAnchor="middle" fontSize="11" fill="currentColor">−{fmt(max)}%</text>
      <text x={origin} y="17" textAnchor="middle" fontSize="11" fill="currentColor">0%</text>
      <text x={origin + half} y="17" textAnchor="middle" fontSize="11" fill="currentColor">+{fmt(max)}%</text>
      <line x1={origin} x2={origin} y1="28" y2={height - 8} stroke="currentColor" opacity="0.3" />
      {items.map((m, i) => {
        const y = 38 + i * 40;
        const width = Math.abs(m.percent ?? 0) / max * half;
        const label = m.percent === null ? t("dash.cmp.new") : `${signed(m.percent, fmt)}%`;
        return <g key={m.key}>
          <text x="0" y={y + 17} fontSize="13" fill="currentColor">{t(`dash.metric.${m.key}.short`)}</text>
          <line x1="230" x2="550" y1={y + 12} y2={y + 12} stroke="currentColor" opacity="0.06" />
          {width > 0 ? <rect x={m.delta < 0 ? origin - width : origin} y={y} width={width} height="22" rx="3" fill={m.delta < 0 ? "#e11d48" : "#0b63b8"}>
            <title>{`${t(`dash.metric.${m.key}`)}: ${fmt(m.base)} → ${fmt(m.target)}, ${label}`}</title>
          </rect> : <circle cx={origin} cy={y + 12} r="3" fill="currentColor" opacity="0.5" />}
          <text x="565" y={y + 17} fontSize="13" fontWeight="600" fill="currentColor">{label}</text>
        </g>;
      })}
    </svg>
  </div>;
}

/** Chỉ ghép các chỉ số đếm; tỉ lệ và điểm thi đua nằm trong bảng riêng bên dưới. */
function PairedChart({ items, baseLabel, targetLabel, t, fmt }: { items: ComparedMetric[]; baseLabel: string; targetLabel: string; t: TFn; fmt: Fmt }) {
  const counts = items.filter((m) => !m.unit);
  if (!counts.length) return <p className="py-8 text-sm text-muted">{t("dash.cmp.noCounts")}</p>;
  const max = Math.max(1, ...counts.flatMap((m) => [m.base, m.target]));
  return <div className="overflow-x-auto">
    <svg viewBox={`0 0 720 ${counts.length * 60 + 44}`} className="mx-auto block h-auto w-full min-w-[480px] max-w-[720px]" role="img" aria-label={t("dash.cmp.pairedAria", { base: baseLabel, target: targetLabel })}>
      {[0, 0.5, 1].map((step) => <g key={step}>
        <line x1={220 + step * 390} x2={220 + step * 390} y1="25" y2={counts.length * 60 + 28} stroke="currentColor" opacity="0.1" />
        <text x={220 + step * 390} y="15" textAnchor="middle" fontSize="11" fill="currentColor">{fmt(max * step)}</text>
      </g>)}
      {counts.map((m, i) => <g key={m.key}>
        <text x="0" y={i * 60 + 58} fontSize="13" fill="currentColor">{t(`dash.metric.${m.key}.short`)}</text>
        {[m.base, m.target].map((value, j) => <g key={j}>
          <rect x="220" y={i * 60 + 33 + j * 24} width={value / max * 390} height="19" rx="3" fill={j ? "#0b63b8" : "#94a3b8"}>
            <title>{`${t(`dash.metric.${m.key}`)} · ${j ? targetLabel : baseLabel}: ${fmt(value)}`}</title>
          </rect>
          <text x={228 + value / max * 390} y={i * 60 + 47 + j * 24} fontSize="12" fill="currentColor">{fmt(value)}</text>
        </g>)}
      </g>)}
    </svg>
  </div>;
}

export function WeekComparison({ rows, metrics }: { rows: WeekRow[]; metrics: Metric[] }) {
  const t = useT();
  const loc = intlLocale(useLocale());
  const fmt: Fmt = (n) => n.toLocaleString(loc, { maximumFractionDigits: 1 });
  const sg = (n: number) => signed(n, fmt);
  // Mặc định đối chiếu hai tuần đã hoàn tất để tránh so tuần đủ với tuần đang diễn ra.
  const completed = rows.filter((r) => r.label !== "Tuần này");
  const initialTarget = completed.at(-1) ?? rows.at(-1);
  const initialBase = completed.at(-2) ?? rows.find((r) => r.start !== initialTarget?.start);
  const [baseStart, setBase] = useState(initialBase?.start ?? "");
  const [targetStart, setTarget] = useState(initialTarget?.start ?? "");
  const [view, setView] = useState<"change" | "values">("change");
  const base = rows.find((r) => r.start === baseStart);
  const target = rows.find((r) => r.start === targetStart);
  if (!base || !target || base.start === target.start) return <p className="mt-6 text-sm text-muted">{t("dash.cmp.needTwo")}</p>;
  const items: ComparedMetric[] = metrics.map((m) => ({ ...m, base: base[m.key], target: target[m.key], delta: target[m.key] - base[m.key], percent: base[m.key] === 0 ? target[m.key] === 0 ? 0 : null : (target[m.key] - base[m.key]) / Math.abs(base[m.key]) * 100 }));
  const increased = items.filter((m) => m.delta > 0).length;
  const decreased = items.filter((m) => m.delta < 0).length;
  const unchanged = items.length - increased - decreased;
  const swap = () => { setBase(targetStart); setTarget(baseStart); };
  const highlights = [...items].filter((m) => m.delta !== 0).sort((a, b) => (b.percent === null ? Infinity : Math.abs(b.percent)) - (a.percent === null ? Infinity : Math.abs(a.percent))).slice(0, 3);
  return <section className="space-y-4">
    <div className="rounded-2xl border border-border bg-white/90 p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-base font-semibold">{t("dash.cmp.title")}</h2><p className="mt-1 text-xs text-muted">{t("dash.cmp.pick")}</p></div>
        <div aria-live="polite" className="flex flex-wrap gap-2 text-xs">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary-light px-2.5 py-1 text-primary"><ArrowUpRight className="size-3.5" />{t("dash.cmp.up", { n: increased })}</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-rose-700"><ArrowDownRight className="size-3.5" />{t("dash.cmp.down", { n: decreased })}</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-muted"><Minus className="size-3.5" />{t("dash.cmp.same", { n: unchanged })}</span>
        </div>
      </div>
      <div className="grid items-end gap-3 sm:max-w-2xl sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <label className="grid min-w-0 gap-1.5 text-xs font-medium text-muted"><span className="flex items-center gap-1.5"><CalendarDays className="size-3.5" />{t("dash.cmp.baseWeek")}</span>
          <select value={baseStart} onChange={(e) => setBase(e.target.value)} className="h-9 min-w-0 w-full rounded-lg border border-border bg-slate-50 px-3 text-sm text-foreground">
            {rows.map((r) => <option key={r.start} value={r.start} disabled={r.start === targetStart}>{weekLabel(r, t)}</option>)}
          </select>
        </label>
        <button type="button" onClick={swap} aria-label={t("dash.cmp.swap")} title={t("dash.cmp.swap")} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-border px-3 text-primary transition-colors hover:bg-primary-light"><ArrowLeftRight className="size-4" /><span className="text-xs sm:sr-only">{t("dash.cmp.swap")}</span></button>
        <label className="grid min-w-0 gap-1.5 text-xs font-medium text-muted"><span className="flex items-center gap-1.5"><CalendarDays className="size-3.5" />{t("dash.cmp.targetWeek")}</span>
          <select value={targetStart} onChange={(e) => setTarget(e.target.value)} className="h-9 min-w-0 w-full rounded-lg border border-border bg-slate-50 px-3 text-sm text-foreground">
            {rows.map((r) => <option key={r.start} value={r.start} disabled={r.start === baseStart}>{weekLabel(r, t)}</option>)}
          </select>
        </label>
      </div>
    </div>
    {(base.label === "Tuần này" || target.label === "Tuần này") && <p role="status" className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{t("dash.cmp.partial")}</p>}
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_260px]">
    <div className="min-w-0 rounded-2xl border border-border bg-white/90 p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div><h3 className="font-semibold">{view === "change" ? t("dash.cmp.mostChanged") : t("dash.cmp.values")}</h3><p className="mt-1 text-xs text-muted">{t("dash.cmp.weekVs", { target: dateLabel(target.start), base: dateLabel(base.start) })}</p></div>
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1" aria-label={t("dash.cmp.chartKind")}>
          {([["change", t("dash.cmp.viewChange")], ["values", t("dash.cmp.viewPaired")]] as const).map(([key, label]) => <button key={key} type="button" aria-pressed={view === key} onClick={() => setView(key)} className={`rounded px-3 py-2 text-xs font-medium ${view === key ? "bg-white text-primary shadow-sm" : "text-muted hover:text-foreground"}`}>{label}</button>)}
        </div>
      </div>
      {view === "change" ? <>
        <p className="mb-3 text-xs text-muted">{t("dash.cmp.legendNote")}</p>
        {items.some((m) => m.base < 0) && <p className="mb-3 text-xs text-muted">{t("dash.cmp.negNote")}</p>}
        <ChangeChart t={t} fmt={fmt} items={[...items].sort((a, b) => Math.abs(b.percent ?? 0) - Math.abs(a.percent ?? 0))} />
      </> : <>
        <div className="mb-3 flex flex-wrap gap-4 text-xs"><span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-slate-400" />{t("dash.cmp.legendBase", { d: dateLabel(base.start) })}</span><span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-primary" />{t("dash.cmp.legendTarget", { d: dateLabel(target.start) })}</span></div>
        <p className="mb-3 text-xs text-muted">{t("dash.cmp.pairedNote")}</p>
        <PairedChart t={t} fmt={fmt} items={items} baseLabel={dateLabel(base.start)} targetLabel={dateLabel(target.start)} />
      </>}
    </div>
    <aside className="rounded-2xl border border-border bg-white/90 p-4 shadow-sm sm:p-5">
      <h3 className="text-sm font-semibold">{t("dash.cmp.highlights")}</h3>
      <p className="mt-1 text-xs text-muted">{t("dash.cmp.vsWeek", { d: dateLabel(base.start) })}</p>
      <div className="mt-4 divide-y divide-border">
        {highlights.length ? highlights.map((m) => <div key={m.key} className="py-3 first:pt-0 last:pb-0">
          <p className="text-xs text-muted">{t(`dash.metric.${m.key}`)}</p>
          <p className={`mt-1 text-xl font-semibold tabular-nums ${m.delta < 0 ? "text-rose-700" : "text-primary"}`}>{m.percent === null ? t("dash.cmp.new") : `${sg(m.percent)}%`}</p>
          <p className="mt-1 text-xs text-muted">{fmt(m.base)} → {fmt(m.target)}{m.unit && ` ${unitOf(m.unit, t)}`}</p>
        </div>) : <p className="text-sm text-muted">{t("dash.cmp.unchanged")}</p>}
      </div>
    </aside>
    </div>
    <div className="overflow-x-auto rounded-2xl border border-border bg-white/90">
      <table className="w-full min-w-[680px] text-sm">
        <caption className="p-4 text-left font-semibold">{t("dash.cmp.detail", { target: dateLabel(target.start), base: dateLabel(base.start) })}</caption>
        <thead className="border-y border-border bg-slate-100/50 text-xs text-muted"><tr><th scope="col" className="px-4 py-3 text-left">{t("dash.ins.thMetric")}</th><th scope="col" className="px-4 py-3 text-right">{t("dash.cmp.thBase", { d: dateLabel(base.start) })}</th><th scope="col" className="px-4 py-3 text-right">{t("dash.cmp.thTarget", { d: dateLabel(target.start) })}</th><th scope="col" className="px-4 py-3 text-right">{t("dash.cmp.thDiff")}</th><th scope="col" className="px-4 py-3 text-right">{t("dash.cmp.thRel")}</th></tr></thead>
        <tbody>{items.map((m) => <tr key={m.key} className="border-b border-border last:border-0">
          <th scope="row" className="px-4 py-3 text-left font-medium" title={t(`dash.metric.${m.key}.hint`)}>{t(`dash.metric.${m.key}`)}</th>
          <td className="px-4 py-3 text-right tabular-nums">{fmt(m.base)}{m.unit && ` ${unitOf(m.unit, t)}`}</td>
          <td className="px-4 py-3 text-right font-semibold tabular-nums">{fmt(m.target)}{m.unit && ` ${unitOf(m.unit, t)}`}</td>
          <td className={`whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums ${m.delta < 0 ? "text-rose-700" : m.delta > 0 ? "text-primary" : "text-muted"}`}>{sg(m.delta)}{m.unit === "%" ? t("dash.ins.pctPoints") : m.unit ? ` ${unitOf(m.unit, t)}` : ""}</td>
          <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{m.percent === null ? t("dash.cmp.new") : `${sg(m.percent)}%`}</td>
        </tr>)}</tbody>
      </table>
    </div>
  </section>;
}
