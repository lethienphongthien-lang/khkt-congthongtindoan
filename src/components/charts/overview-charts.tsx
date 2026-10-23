"use client";
import { Bar, BarChart, CartesianGrid, LabelList, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// Màu lấy từ biến CSS (--chart-1 xanh Đoàn, --chart-2 vàng đậm) nên tự đổi theo chế độ sáng/tối
const INK = "var(--color-muted)";
const tick = { fontSize: 12, fill: INK };
const cursor = { fill: "rgba(127,140,160,0.14)" };
const tip = { fontSize: 12, borderRadius: 6, border: "1px solid var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" };
const gridProps = { vertical: false, stroke: "var(--color-border)" } as const;

/** Số đoàn viên và thanh niên theo từng khối (cột chồng, có tổng ở đầu cột). */
export function GradeChart({ data }: { data: { grade: string; doanVien: number; thanhNien: number }[] }) {
  const rows = data.map((d) => ({ ...d, total: d.doanVien + d.thanhNien }));
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <BarChart data={rows} margin={{ top: 22, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="grade" tickLine={false} axisLine={false} tick={tick} />
          <YAxis tickLine={false} axisLine={false} tick={tick} allowDecimals={false} />
          <Tooltip cursor={cursor} contentStyle={tip} formatter={(v, n) => [Number(v).toLocaleString("vi-VN"), n]} />
          <Legend verticalAlign="top" align="right" iconType="square" height={20} wrapperStyle={{ fontSize: 12, top: -4 }} formatter={(v) => <span style={{ color: "var(--color-foreground)" }}>{v}</span>} />
          <Bar dataKey="doanVien" name="Đoàn viên" stackId="s" fill="var(--chart-1)" stroke="var(--color-background)" strokeWidth={2} maxBarSize={64} isAnimationActive={false} />
          <Bar dataKey="thanhNien" name="Thanh niên" stackId="s" fill="var(--chart-2)" stroke="var(--color-background)" strokeWidth={2} radius={[4, 4, 0, 0]} maxBarSize={64} isAnimationActive={false}>
            <LabelList dataKey="total" position="top" style={{ fontSize: 12, fontWeight: 600, fill: "var(--color-foreground)" }} formatter={(v: unknown) => Number(v).toLocaleString("vi-VN")} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Thanh ngang xếp hạng (Chi đoàn nào nhiều/ít nhất), giá trị ghi ngay đầu thanh. */
export function RankBars({ data, unit = "", series = "Giá trị", color = "var(--chart-1)", max, labelWidth = 64 }: { data: { name: string; value: number; note?: string }[]; unit?: string; series?: string; color?: string; max?: number; /** Bề rộng cột tên (tên dài thì tăng, tên quá dài được cắt bằng "…"). */ labelWidth?: number }) {
  return (
    <div className="w-full" style={{ height: Math.max(120, data.length * 30 + 12) }}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 44, left: 0, bottom: 0 }} barCategoryGap={6}>
          <XAxis type="number" hide domain={[0, max ?? "dataMax"]} />
          <YAxis type="category" dataKey="name" width={labelWidth} tickLine={false} axisLine={false} tick={tick} interval={0} tickFormatter={(v: string) => { const max = Math.max(6, Math.floor(labelWidth / 7)); return v.length > max ? `${v.slice(0, max - 1)}…` : v; }} />
          <Tooltip cursor={cursor} contentStyle={tip} formatter={(v, _n, p) => [`${Number(v).toLocaleString("vi-VN")}${unit}${p.payload.note ? ` (${p.payload.note})` : ""}`, series]} />
          <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} maxBarSize={18} isAnimationActive={false}>
            <LabelList dataKey="value" position="right" style={{ fontSize: 12, fontWeight: 600, fill: "var(--color-foreground)" }} formatter={(v: unknown) => `${Number(v).toLocaleString("vi-VN")}${unit}`} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Cột theo tháng (kết nạp đoàn viên mới...). */
export function MonthBars({ data, series, unit = "" }: { data: { month: string; value: number }[]; series: string; unit?: string }) {
  return (
    <div className="h-48 w-full">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 20, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="month" tickLine={false} axisLine={false} tick={tick} />
          <YAxis tickLine={false} axisLine={false} tick={tick} allowDecimals={false} />
          <Tooltip cursor={cursor} contentStyle={tip} formatter={(v) => [`${Number(v).toLocaleString("vi-VN")}${unit}`, series]} />
          <Bar dataKey="value" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={40} isAnimationActive={false}>
            <LabelList dataKey="value" position="top" style={{ fontSize: 12, fontWeight: 600, fill: "var(--color-foreground)" }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
