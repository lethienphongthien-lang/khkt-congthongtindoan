import Link from "next/link";
import { themeOf } from "@/components/games/game-meta";
import { formatDate } from "@/utils";
import { cn } from "@/utils";

export type PublicQuiz = { id: string; title: string; description: string | null; theme: string; points: number; secondsPerQuestion: number; endsAt: Date | null; _count: { questions: number } };
export const quizHref = (id: string) => `/tro-choi/choi/${id}`;

/** Thẻ trò chơi tích điểm trên cổng thông tin: bấm để chơi (cần đăng nhập bằng tài khoản đoàn viên). */
export function QuizCards({ items }: { items: PublicQuiz[] }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((q) => {
        const th = themeOf(q.theme);
        return (
          <Link key={q.id} href={quizHref(q.id)} className="group flex flex-col overflow-hidden rounded border border-border bg-white/90 transition-shadow hover:shadow-md">
            <div className={cn("flex items-center gap-3 bg-gradient-to-br px-3 py-4 text-white", th.grad)}>
              <span className="text-4xl">{th.emoji}</span>
              <div className="min-w-0"><div className="line-clamp-2 leading-tight font-bold">{q.title}</div><div className="text-xs opacity-90">{th.label}</div></div>
            </div>
            <div className="flex flex-1 flex-col gap-1 p-2 text-sm">
              {q.description && <p className="line-clamp-2 text-slate-600">{q.description}</p>}
              <div className="flex flex-wrap gap-x-3 text-xs text-muted"><span>{q._count.questions} câu</span><span>{q.secondsPerQuestion}s/câu</span><span className="font-semibold text-emerald-600">{q.points ? `+${q.points} điểm` : "Chơi cho vui"}</span>{q.endsAt && <span>Hạn {formatDate(q.endsAt)}</span>}</div>
              <span className="mt-auto inline-flex w-fit items-center rounded-full bg-primary px-3 py-1 text-xs font-bold text-white group-hover:bg-primary-dark">Chơi ngay →</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
