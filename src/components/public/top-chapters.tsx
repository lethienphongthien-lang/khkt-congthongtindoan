import Link from "next/link";
import { Crown, Medal } from "lucide-react";
import { Block, EmptyPublic } from "./blocks";
import { getT } from "@/lib/i18n/server";

export type TopChapter = { id: string; name: string; rank: number; total: number };

const TONE = [
  { ring: "from-amber-300 via-yellow-200 to-amber-400", chip: "bg-amber-500 text-white", text: "text-amber-700", label: "public.top.first" },
  { ring: "from-slate-300 via-slate-100 to-slate-300", chip: "bg-slate-500 text-white", text: "text-slate-600", label: "public.top.second" },
  { ring: "from-orange-300 via-amber-100 to-orange-300", chip: "bg-orange-600 text-white", text: "text-orange-700", label: "public.top.third" },
] as const;

/** Chi đoàn dẫn đầu thi đua tuần: thẻ có huy hiệu vàng, bạc, đồng. Chỉ hiện Chi đoàn có điểm; chưa ai có điểm thì báo đang chờ cập nhật. */
export async function TopChapters({ title, items, note }: { title: string; items: TopChapter[]; note?: string }) {
  const t = await getT();
  const top = items.filter((r) => r.total > 0 && r.rank <= 3).slice(0, 5);
  return (
    <Block title={title} href="/thi-dua">
      {note && top.length > 0 && <p className="mb-1.5 text-xs text-muted">{note}</p>}
      {top.length === 0 ? <EmptyPublic text={t("public.top.noPoints")} /> : (
        <ol className="space-y-1.5">
          {top.map((r) => {
            const tone = TONE[r.rank - 1] ?? TONE[2];
            const first = r.rank === 1;
            return (
              <li key={r.id} className={`flex items-center gap-3 rounded-lg bg-gradient-to-r p-0.5 shadow-sm transition-transform duration-300 hover:-translate-y-0.5 hover:shadow-md ${tone.ring}`}>
                <div className={`flex w-full items-center gap-3 rounded-[7px] bg-white px-2.5 ${first ? "py-3" : "py-2"}`}>
                  <span className={`flex shrink-0 items-center justify-center rounded-full shadow ${tone.chip} ${first ? "size-11" : "size-9"}`} title={t(tone.label)}>
                    {first ? <Crown className="size-5" /> : <Medal className="size-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className={`truncate font-bold ${first ? "text-lg" : "text-base"}`}>{t("public.chapterOf", { name: r.name })}</div>
                    <div className={`text-xs font-medium ${tone.text}`}>{t(tone.label)}</div>
                  </div>
                  <div className="text-right">
                    <div className={`font-extrabold tabular-nums ${tone.text} ${first ? "text-2xl" : "text-xl"}`}>{r.total}</div>
                    <div className="text-[10px] text-muted uppercase">{t("public.top.points")}</div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      <Link href="/thi-dua/chi-doan-tieu-bieu" className="mt-2 inline-block text-[13px] text-primary hover:underline">{t("public.top.more")}</Link>
    </Block>
  );
}
