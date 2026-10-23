import { Crown, Medal } from "lucide-react";
import { DataTable, Td, Th } from "@/components/ui/misc";
import type { WebRanking } from "@/lib/services/web-ranking";

const TONE: Record<number, { chip: string; ring: string; text: string }> = {
  1: { chip: "bg-amber-500 text-white", ring: "border-amber-300 bg-amber-50/70", text: "text-amber-700" },
  2: { chip: "bg-slate-500 text-white", ring: "border-slate-300 bg-slate-50/70", text: "text-slate-600" },
  3: { chip: "bg-orange-600 text-white", ring: "border-orange-300 bg-orange-50/70", text: "text-orange-700" },
};

/** Top cá nhân theo điểm trong kỳ: hạng 1–3 có huy hiệu vàng, bạc, đồng; đồng điểm thì đồng hạng. */
export function TopPeople({ rows }: { rows: WebRanking["top"] }) {
  const max = Math.max(1, ...rows.map((r) => r.points));
  return (
    <ol className="space-y-1.5">
      {rows.map((r) => {
        const t = TONE[r.rank];
        return (
          <li key={r.id} className={`rounded-lg border px-3 py-2 ${t ? t.ring : "border-border bg-white/85"}`}>
            <div className="flex items-center gap-3">
              <span className={`flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${t ? t.chip : "bg-slate-100 text-slate-600"}`} title={`Hạng ${r.rank}`}>
                {r.rank === 1 ? <Crown className="size-4" /> : r.rank <= 3 ? <Medal className="size-4" /> : r.rank}
              </span>
              <div className="min-w-0 flex-1"><div className="truncate font-semibold">{r.name}</div><div className="text-xs text-muted">Chi đoàn {r.department}</div></div>
              <div className="shrink-0 text-right"><div className={`text-xl leading-none font-extrabold tabular-nums ${t ? t.text : "text-primary-dark"}`}>{r.points}</div><div className="text-[10px] text-muted uppercase">điểm</div></div>
            </div>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-200/70"><div className={`h-full rounded-full ${r.rank === 1 ? "bg-amber-500" : r.rank === 2 ? "bg-slate-400" : r.rank === 3 ? "bg-orange-500" : "bg-primary"}`} style={{ width: `${(r.points / max) * 100}%` }} /></div>
          </li>
        );
      })}
    </ol>
  );
}

/** Xếp hạng hoạt động trên web: Chi đoàn theo điểm bình quân mỗi đoàn viên và Top 5 cá nhân. Điểm = chơi trò chơi + 1 điểm mỗi ngày truy cập. */
export function WebRankingSection({ data }: { data: WebRanking }) {
  const hasData = data.departments.some((d) => d.points > 0);
  return (
    <section className="mt-8">
      <h2 className="mb-1 border-l-4 border-primary pl-3 text-lg font-bold text-primary-dark">Xếp hạng hoạt động trên web · {data.period.label}</h2>
      <p className="mb-3 text-sm text-muted">Điểm đến từ chơi trò chơi tích điểm, truy cập hệ thống (mỗi ngày +1 điểm) và tình nguyện của Chi đoàn. Chi đoàn xếp theo điểm bình quân mỗi đoàn viên nên lớp đông hay ít đều công bằng.{data.fallback && " Kỳ này chưa có điểm nên đang hiển thị kết quả của tuần gần nhất."}</p>
      {!hasData ? <p className="rounded border border-border bg-white/85 p-4 text-sm text-muted">Chưa có điểm hoạt động trong kỳ này.</p> : (
        <div className="grid gap-4 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <h3 className="mb-2 font-semibold">Chi đoàn theo điểm bình quân</h3>
            <DataTable>
              <thead><tr><Th>Hạng</Th><Th>Chi đoàn</Th><Th className="text-right">Đoàn viên</Th><Th className="text-right">Tổng điểm</Th><Th className="text-right">Bình quân</Th></tr></thead>
              <tbody>{data.departments.filter((d) => d.points > 0).slice(0, 10).map((d) => (
                <tr key={d.id}><Td className="font-semibold tabular-nums">{d.rank}</Td><Td className="font-medium">Chi đoàn {d.name}</Td><Td className="text-right tabular-nums">{d.members}</Td><Td className="text-right tabular-nums">{d.points}</Td><Td className="text-right font-semibold tabular-nums">{d.avg}</Td></tr>
              ))}</tbody>
            </DataTable>
          </div>
          <div className="lg:col-span-2">
            <h3 className="mb-2 font-semibold">Top 5 nổi bật</h3>
            <TopPeople rows={data.top} />
          </div>
        </div>
      )}
    </section>
  );
}
