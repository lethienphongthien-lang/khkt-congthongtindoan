import Link from "next/link";
import { Crown, Medal } from "lucide-react";

export type GroupRow = { id: string; rank: number; name: string; members: number; total: number };

const TONE: Record<number, { chip: string; box: string; text: string; bar: string }> = {
  1: { chip: "bg-gradient-to-br from-amber-300 to-amber-500 text-white", box: "border-amber-300 bg-amber-50/70", text: "text-amber-700", bar: "bg-amber-400" },
  2: { chip: "bg-gradient-to-br from-slate-300 to-slate-500 text-white", box: "border-slate-300 bg-slate-50/70", text: "text-slate-600", bar: "bg-slate-400" },
  3: { chip: "bg-gradient-to-br from-orange-300 to-orange-600 text-white", box: "border-orange-300 bg-orange-50/70", text: "text-orange-700", bar: "bg-orange-400" },
};

/**
 * Bảng xếp hạng dạng thẻ: mỗi Chi đoàn một thẻ có hạng (huy hiệu vàng, bạc, đồng), tên lớp, điểm riêng và thanh điểm.
 * Chia 2 cột theo chiều dọc (đọc hết cột trái rồi sang cột phải) để danh sách ngắn gọn.
 */
export function RankGroups({ rows, mineId, linkBase }: { rows: GroupRow[]; mineId?: string | null; linkBase?: string }) {
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.total)));
  return (
    <ol className="gap-x-3 space-y-2 md:columns-2 md:[&>li]:break-inside-avoid">
      {rows.map((r) => {
        const t = TONE[r.rank];
        const body = (
          <>
            <span className={`flex size-10 shrink-0 items-center justify-center rounded-full text-base font-bold shadow-sm ${t ? t.chip : "bg-slate-100 text-slate-600"}`} title={`Hạng ${r.rank}`}>
              {r.rank === 1 ? <Crown className="size-5" /> : r.rank <= 3 ? <Medal className="size-5" /> : r.rank}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate font-semibold">Chi đoàn {r.name}</span>
                <span className={`shrink-0 text-xl leading-none font-extrabold tabular-nums ${t ? t.text : "text-primary-dark"}`}>{r.total}<span className="ml-0.5 text-[10px] font-medium text-muted uppercase"> điểm</span></span>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200/70"><div className={`h-full rounded-full ${r.total < 0 ? "bg-danger" : t ? t.bar : "bg-primary"}`} style={{ width: `${(Math.abs(r.total) / max) * 100}%` }} /></div>
                <span className="shrink-0 text-xs text-muted">{r.members} đoàn viên</span>
              </div>
            </div>
          </>
        );
        const cls = `flex items-center gap-3 rounded-lg border px-3 py-2 shadow-sm transition-shadow ${t ? t.box : "border-border bg-white/85"} ${mineId === r.id ? "ring-2 ring-primary" : ""}`;
        return <li key={r.id}>{linkBase ? <Link href={`${linkBase}/${r.id}`} className={`${cls} hover:shadow-md`}>{body}</Link> : <div className={cls}>{body}</div>}</li>;
      })}
    </ol>
  );
}
