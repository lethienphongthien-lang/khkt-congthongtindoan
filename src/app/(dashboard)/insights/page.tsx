import Link from "next/link";
import { ArrowLeftRight, BarChart3, CalendarDays, Eye, LayoutDashboard, SlidersHorizontal, UserCheck } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { vnDay } from "@/lib/services/visits";
import { compareAt, departmentEngagement, yearActivity, METRICS, type MetricKey, topArticles, viewTotals, weeklyInsights } from "@/lib/services/insights";
import { KIND_LABEL, articleHref } from "@/lib/services/public";
import { DataTable, PageHeader, Section, Td, Th } from "@/components/ui/misc";
import { ClassGrid } from "@/components/insights/class-grid";
import { WeekComparison } from "@/components/insights/week-comparison";
import { BarChart } from "@/components/insights/bar-chart";
import { loadCalendars } from "@/lib/services/school-calendar";
import { rangeFromParams, schoolYearOf, yearLabel } from "@/lib/school-calendar";
import { str } from "@/utils";

export const metadata = { title: "Thống kê" };

const fmt = (n: number) => n.toLocaleString("vi-VN", { maximumFractionDigits: 1 });

const ddmm = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
const addDay = (d: string, n: number) => new Date(new Date(`${d}T00:00:00Z`).getTime() + n * 86_400_000).toISOString().slice(0, 10);

/** Số của tuần gần nhất đã đủ 7 ngày (ghi rõ tuần nào), kèm mức thay đổi so với tuần liền trước đó. */
function Delta({ rows, k, unit }: { rows: Awaited<ReturnType<typeof weeklyInsights>>["rows"]; k: MetricKey; unit: string }) {
  if (rows.length < 3) return null;
  const last = rows[rows.length - 2], before = rows[rows.length - 3];
  const cur = last[k], prev = before[k];
  const isPct = unit === "%";
  // Chỉ số phần trăm: nêu chênh lệch tuyệt đối (điểm %) để không lẫn "% của %"; chỉ số đếm: nêu % tăng giảm
  const diff = isPct ? cur - prev : prev > 0 ? ((cur - prev) / prev) * 100 : null;
  const sign = diff !== null && diff >= 0 ? "+" : "−";
  return (
    <div className="shrink-0 text-right">
      <div className="text-3xl leading-none font-bold text-primary tabular-nums">{fmt(cur)}<span className="ml-0.5 text-sm font-medium text-muted">{unit}</span></div>
      {diff !== null && <div className={`mt-1 whitespace-nowrap text-xs font-semibold ${diff >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{diff >= 0 ? "▲" : "▼"} {sign}{fmt(Math.abs(diff))}{isPct ? " điểm %" : "%"} <span className="font-normal text-muted">so với {ddmm(before.start)}</span></div>}
      <div className="whitespace-nowrap text-[11px] text-muted">Tuần {ddmm(last.start)} – {ddmm(addDay(last.start, 6))}</div>
    </div>
  );
}

export default async function InsightsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireRole(["ADMIN"]);
  const sp = await searchParams;
  const weeks = Math.min(52, Math.max(4, Math.floor(Number(str(sp.tuan)) || 8)));
  const comparison = str(sp.tab) === "sosanh";
  const moc = /^\d{4}-\d{2}-\d{2}$/.test(str(sp.moc) ?? "") && str(sp.moc)! <= vnDay() ? str(sp.moc)! : "";
  const cals = await loadCalendars();
  const curYear = schoolYearOf();
  const years = [...new Set([...cals.map((c) => c.startYear), curYear])].sort((a, b) => b - a);
  const nam = years.includes(Number(str(sp.nam))) ? String(Number(str(sp.nam))) : String(curYear);
  const yearRange = rangeFromParams(cals, nam, "");
  const [{ rows, members }, depts, top, views, yearRows] = await Promise.all([weeklyInsights(weeks), departmentEngagement(), topArticles(), viewTotals(), yearActivity(yearRange)]);
  const tabHref = (tab: string) => `/insights?${new URLSearchParams({ tuan: String(weeks), nam, moc, tab })}`;
  const sumYear = (k: "reports" | "registered" | "completed" | "rejected") => yearRows.reduce((s, r) => s + r[k], 0);
  const totalAcc = depts.reduce((s, d) => s + d.total, 0);
  const activatedAcc = depts.reduce((s, d) => s + d.activated, 0);
  const activatedRate = totalAcc ? Math.round((activatedAcc / totalAcc) * 1000) / 10 : 0;
  const currentWeek = rows.at(-1)!;
  const cmp = moc ? compareAt(rows, moc) : null;

  return (
    <>
      <PageHeader title="Thống kê" description="Theo dõi mức tham gia và đối chiếu hiệu quả hoạt động theo tuần." actions={
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-white/90 px-3 py-1.5 text-xs text-muted"><UserCheck className="size-3.5 text-primary" />{fmt(members)} đoàn viên</span>
      } />

      <div className="mb-5 overflow-hidden rounded-2xl border border-border bg-white/90 shadow-sm">
        <div className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 ${comparison ? "" : "border-b border-border"}`}>
          <nav aria-label="Chế độ thống kê" className="inline-flex max-w-full gap-1 rounded-xl bg-slate-100 p-1">
            {([{ tab: "tongquan", label: "Tổng quan", icon: LayoutDashboard, active: !comparison }, { tab: "sosanh", label: "So sánh các tuần", icon: ArrowLeftRight, active: comparison }]).map(({ tab, label, icon: Icon, active }) =>
              <Link key={tab} href={tabHref(tab)} aria-current={active ? "page" : undefined} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${active ? "bg-white text-primary shadow-sm" : "text-muted hover:text-foreground"}`}><Icon className="size-4 shrink-0" /><span>{label}</span></Link>
            )}
          </nav>
          <span className="flex items-center gap-1.5 text-xs text-muted"><CalendarDays className="size-3.5" />Thứ Hai – Chủ nhật · Giờ Việt Nam</span>
        </div>
        {!comparison && <form method="get" className="grid grid-cols-2 items-end gap-3 p-4 text-sm sm:flex sm:flex-wrap">
          <input type="hidden" name="tab" value={comparison ? "sosanh" : "tongquan"} />
          <label className="grid gap-1.5 text-xs font-medium text-muted">Khoảng hiển thị
            <select name="tuan" defaultValue={weeks} className="h-9 w-full rounded-lg border border-border bg-slate-50 px-3 text-sm text-foreground sm:w-40">
              {[8, 12, 16, 26, 52].map((w) => <option key={w} value={w}>{w} tuần gần nhất</option>)}
            </select>
          </label>
          <label className="grid gap-1.5 text-xs font-medium text-muted">Năm học
            <select name="nam" defaultValue={nam} className="h-9 w-full rounded-lg border border-border bg-slate-50 px-3 text-sm text-foreground sm:w-36">
              {years.map((y) => <option key={y} value={y}>{yearLabel(y)}</option>)}
            </select>
          </label>
          <label className="grid gap-1.5 text-xs font-medium text-muted">Mốc triển khai · tùy chọn
            <input type="date" name="moc" defaultValue={moc} max={vnDay()} className="h-9 min-w-0 w-full rounded-lg border border-border bg-slate-50 px-3 text-sm text-foreground sm:w-44" />
          </label>
          <button className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white transition-opacity hover:opacity-90"><SlidersHorizontal className="size-3.5" />Áp dụng</button>
          {moc && <Link href={`/insights?${new URLSearchParams({ tuan: String(weeks), nam, tab: comparison ? "sosanh" : "tongquan" })}`} className="flex h-9 items-center text-xs text-muted hover:text-primary">Bỏ mốc</Link>}
        </form>}
      </div>
      {comparison ? <WeekComparison key={weeks} rows={rows} metrics={METRICS} /> : <>
      <div className="mb-5 grid gap-3 md:grid-cols-3">
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-white/90 p-5 shadow-sm">
          <div className="min-w-0"><div className="flex items-center gap-2 text-xs font-medium text-muted"><UserCheck className="size-4 text-primary" />Tài khoản đã kích hoạt</div><div className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">{fmt(activatedRate)}<span className="ml-0.5 text-lg text-muted">%</span></div><p className="mt-1 text-xs text-muted">{fmt(activatedAcc)} / {fmt(totalAcc)} đoàn viên</p></div>
          <svg viewBox="0 0 64 64" className="size-16 shrink-0 -rotate-90" aria-label={`${fmt(activatedRate)}% tài khoản đã kích hoạt`} role="img"><circle cx="32" cy="32" r="26" fill="none" stroke="currentColor" strokeWidth="5" className="text-slate-100" /><circle cx="32" cy="32" r="26" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${activatedRate * 1.634} 163.4`} className="text-primary" /></svg>
        </div>
        <div className="rounded-2xl border border-border bg-white/90 p-5 shadow-sm"><div className="flex items-center justify-between text-xs font-medium text-muted"><span>Tổng lượt xem bài viết</span><span className="rounded-lg bg-primary-light p-2 text-primary"><Eye className="size-4" /></span></div><div className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">{fmt(views.total)}</div><p className="mt-1 text-xs text-muted">Trên các bài viết đã xuất bản</p></div>
        <div className="rounded-2xl border border-primary/20 bg-primary-light/60 p-5 shadow-sm"><div className="flex items-center justify-between text-xs font-medium text-muted"><span>Lượt xem tuần này</span><span className="rounded-lg bg-white/60 p-2 text-primary"><BarChart3 className="size-4" /></span></div><div className="mt-1 text-3xl font-semibold tracking-tight text-primary tabular-nums">{fmt(views.thisWeek)}</div><p className="mt-1 text-xs text-muted">{ddmm(currentWeek.start)} – {ddmm(addDay(currentWeek.start, 6))} · Đang diễn ra</p></div>
      </div>

      {cmp && (
        <Section title={`So sánh trước và sau mốc ${moc.split("-").reverse().join("/")}`}>
          <p className="mb-2 text-xs text-muted">Trung bình {cmp.beforeWeeks} tuần trước mốc so với {cmp.afterWeeks} tuần từ mốc trở đi. Cột xám là trước mốc, cột xanh là sau mốc, đường đỏ là mốc triển khai. Giá trị t là kiểm định Welch (|t| &gt; 2 thường tương ứng p &lt; 0,05; cần ít nhất 2 tuần mỗi bên).</p>
          <DataTable>
            <thead><tr><Th>Chỉ số</Th><Th>Trước (TB ± SD)</Th><Th>Sau (TB ± SD)</Th><Th>Thay đổi</Th><Th>t</Th></tr></thead>
            <tbody>
              {cmp.items.map((m) => (
                <tr key={m.key}>
                  <Td>{m.label}</Td>
                  <Td>{fmt(m.before)} ± {fmt(m.sdBefore)}</Td>
                  <Td>{fmt(m.after)} ± {fmt(m.sdAfter)}</Td>
                  <Td><span className={m.change === null ? "" : m.change >= 0 ? "font-medium text-emerald-700" : "font-medium text-rose-700"}>{m.change === null ? "—" : `${m.change >= 0 ? "+" : ""}${fmt(m.change)}%`}</span></Td>
                  <Td>{m.t === null ? "—" : fmt(m.t)}</Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </Section>
      )}
      {moc && !cmp && <p className="mb-5 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">Mốc này nằm ngoài khoảng đang xem hoặc chưa có tuần nào ở một phía. Hãy tăng số tuần hiển thị.</p>}

      <Section title="Diễn biến theo tuần" className="mt-6">
        <p className="mb-2 text-xs text-muted">Mỗi cột là một tuần, ghi theo ngày thứ Hai đầu tuần (ví dụ 12/10 là tuần 12/10 đến 18/10). Cột cuối cùng ("Tuần này") là tuần hiện tại, đang tính dở nên số còn thấp.</p>
        <div className="grid gap-4 lg:grid-cols-2">
          {METRICS.map((m) => (
            <div key={m.key} className="rounded-lg border border-border border-t-4 border-t-primary bg-white/90 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-primary-dark">{m.label}{m.unit && <span className="font-normal text-muted"> ({m.unit})</span>}</div>
                  <div className="mb-2 text-xs text-muted">{m.hint}</div>
                </div>
                <Delta rows={rows} k={m.key} unit={m.unit} />
              </div>
              <BarChart labels={rows.map((r) => r.label)} values={rows.map((r) => r[m.key])} unit={m.unit}
                markIndex={moc && cmp ? rows.findIndex((r) => r.start >= moc) : undefined} />
            </div>
          ))}
        </div>
      </Section>

      <Section title={`Báo cáo và đăng ký tình nguyện của từng Chi đoàn, năm học ${yearLabel(Number(nam))}`} className="mt-8">
        <p className="mb-2 text-xs text-muted">Đếm theo ngày gửi báo cáo và ngày bí thư đăng ký, trong cả năm học (từ 01/09 đến 31/08 năm sau).</p>
        <ClassGrid
          rows={yearRows.map((d) => ({ id: d.id, name: d.name, values: { reports: d.reports, registered: d.registered } }))}
          metrics={[
            { key: "reports", label: `Báo cáo đã gửi (tổng ${sumYear("reports")})`, agg: "sum" },
            { key: "registered", label: `Đăng ký tình nguyện (tổng ${sumYear("registered")})`, agg: "sum" },
          ]} />
      </Section>

      <Section title="Mức tham gia của từng Chi đoàn (kích hoạt: hiện tại; còn lại: 4 tuần gần nhất)" className="mt-8">
        <ClassGrid
          rows={depts.map((d) => ({ id: d.id, name: d.name, values: { activatedRate: d.activatedRate, activeRate: d.activeRate, avgDays: d.avgDays, playerRate: d.playerRate, volunteerDone: d.volunteerDone } }))}
          metrics={[
            { key: "activatedRate", label: "% đã kích hoạt", unit: "%", agg: "avg" },
            { key: "activeRate", label: "% có truy cập", unit: "%", agg: "avg" },
            { key: "avgDays", label: "Ngày truy cập TB mỗi tuần", agg: "avg" },
            { key: "playerRate", label: "% chơi trò chơi", unit: "%", agg: "avg" },
            { key: "volunteerDone", label: "Tình nguyện hoàn thành", agg: "sum" },
          ]} />
      </Section>

      <Section title="Bài viết được xem nhiều nhất" className="mt-8">
        {top.length === 0 ? <p className="text-sm text-muted">Chưa có lượt xem nào được ghi nhận.</p> : (
          <DataTable>
            <thead><tr><Th>Bài viết</Th><Th>Chuyên mục</Th><Th>Lượt xem</Th></tr></thead>
            <tbody>
              {top.map((a) => (
                <tr key={a.id}><Td><Link href={articleHref(a.slug)} className="text-primary hover:underline">{a.title}</Link></Td><Td>{KIND_LABEL[a.kind]}</Td><Td>{a.viewCount.toLocaleString("vi-VN")}</Td></tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </Section>
      </>}
    </>
  );
}
