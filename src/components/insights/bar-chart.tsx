/** Biểu đồ cột theo tuần (SVG, dựng trên máy chủ). `markIndex`: tuần bắt đầu từ mốc triển khai.  */
export function BarChart({ labels, values, unit, markIndex }: { labels: string[]; values: number[]; unit?: string; markIndex?: number }) {
  const W = 600, H = 170, PAD = 24, n = values.length;
  const max = Math.max(...values, 1);
  const bw = (W - 8) / n;
  return (
    <svg viewBox={`0 0 ${W} ${H + PAD}`} className="h-auto w-full" role="img" aria-label="Biểu đồ theo tuần">
      {[0.5, 1].map((f) => <line key={f} x1="0" x2={W} y1={H - f * (H - 22)} y2={H - f * (H - 22)} stroke="currentColor" opacity="0.08" />)}
      <line x1="0" x2={W} y1={H} y2={H} stroke="currentColor" opacity="0.25" />
      {values.map((v, i) => {
        const h = Math.max((v / max) * (H - 22), v > 0 ? 3 : 0);
        const x = 4 + i * bw;
        const last = i === n - 1;
        const before = markIndex !== undefined && i < markIndex;
        return (
          <g key={i}>
            <rect x={x + bw * 0.14} y={H - h} width={bw * 0.72} height={h} rx="3" fill={before ? "#94a3b8" : "#0b63b8"}>
              <title>{`${labels[i].startsWith("Tuần") ? labels[i] : "Tuần " + labels[i]}: ${v}${unit ? ` ${unit}` : ""}`}</title>
            </rect>
            {n <= 16 && <text x={x + bw / 2} y={H - h - 5} textAnchor="middle" fontSize="12" fontWeight="600" fill="currentColor" opacity={v > 0 ? 0.9 : 0.35}>{v}</text>}
            {(n <= 14 || i % 2 === 0 || last) && <text x={x + bw / 2} y={H + 16} textAnchor="middle" fontSize="11" fontWeight={last ? 700 : 400} fill="currentColor" opacity={last ? 0.9 : 0.6}>{labels[i]}</text>}
          </g>
        );
      })}
      {markIndex !== undefined && markIndex > 0 && markIndex < n && (
        <line x1={4 + markIndex * bw} x2={4 + markIndex * bw} y1="0" y2={H} stroke="#e11d48" strokeWidth="2" strokeDasharray="5 3" />
      )}
    </svg>
  );
}
