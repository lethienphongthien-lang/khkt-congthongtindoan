import Link from "next/link";
import { Flame, Lock, Trophy } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { getGameCap, gamePointsThisWeek, quizScope, weeklyGameLeaders } from "@/lib/services/games";
import { formatDate } from "@/utils";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { themeOf } from "@/components/games/game-meta";
import { cn } from "@/utils";

export const metadata = { title: "Trò chơi" };

export default async function GamesPage() {
  const user = await requireUser();
  const now = new Date();
  const [quizzes, cap, leaders] = await Promise.all([
    db.quiz.findMany({ where: { published: true, OR: [{ startsAt: null }, { startsAt: { lte: now } }], AND: [quizScope({ departmentId: user.departmentId, memberId: user.memberId, isAdmin: !user.memberId })] }, orderBy: { createdAt: "desc" }, take: 30, include: { _count: { select: { questions: true } } } }),
    getGameCap(), weeklyGameLeaders(5),
  ]);
  const memberId = user.memberId;
  const [used, attempts, recent] = memberId
    ? await Promise.all([gamePointsThisWeek(memberId), db.quizAttempt.findMany({ where: { memberId, quizId: { in: quizzes.map((q) => q.id) } }, select: { quizId: true, finishedAt: true, correctCount: true, total: true, pointsAwarded: true, currentIndex: true } }), db.pointTransaction.findMany({ where: { memberId, type: "GAME" }, orderBy: { createdAt: "desc" }, take: 5, select: { id: true, points: true, reason: true, createdAt: true } })])
    : [0, [], []];
  const by = new Map(attempts.map((a) => [a.quizId, a]));
  const pct = cap > 0 ? Math.min(100, Math.round((used / cap) * 100)) : 100;

  return (
    <>
      <PageHeader title="Trò chơi tích điểm" description="Chơi vui, tích điểm cho bản thân và cho Chi đoàn" />
      {memberId && (
        <div className="mb-4 grid gap-3 lg:grid-cols-3">
          <div className="rounded-xl border border-border bg-white p-4 lg:col-span-2">
            <div className="flex items-center justify-between text-sm"><span className="font-semibold">Điểm trò chơi tuần này</span><span className="font-bold text-primary-dark">{used}/{cap}</span></div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500 transition-all" style={{ width: `${pct}%` }} /></div>
            <p className="mt-2 text-xs text-muted">{used >= cap ? "Bạn đã đạt trần điểm trò chơi tuần này. Vẫn có thể chơi cho vui, tuần sau tích điểm tiếp!" : `Còn ${cap - used} điểm có thể tích tuần này. Điểm được cộng vào điểm thi đua Chi đoàn.`}</p>
          </div>
          <div className="rounded-xl border border-border bg-white p-4">
            <div className="flex items-center gap-2 text-sm font-semibold"><Trophy className="size-4 text-amber-500" />Cao thủ tuần này</div>
            {leaders.length === 0 ? <p className="mt-2 text-xs text-muted">Chưa ai ghi điểm. Hãy là người đầu tiên!</p> : (
              <ol className="mt-2 space-y-1">{leaders.map((l) => (
                <li key={l.memberId} className="flex items-center gap-2 text-sm"><span className="w-5 text-center">{["🥇", "🥈", "🥉"][l.rank - 1] ?? l.rank}</span><span className="min-w-0 flex-1 truncate">{l.name} <span className="text-xs text-muted">· {l.department}</span></span><b className="tabular-nums">{l.points}</b></li>
              ))}</ol>
            )}
          </div>
        </div>
      )}

      {memberId && (
        <div className="mb-4 rounded-xl border border-border bg-white p-4">
          <div className="flex items-center justify-between text-sm"><span className="font-semibold">Điểm trò chơi gần đây của tôi</span><Link href="/profile" className="text-primary hover:underline">Xem hồ sơ và toàn bộ lịch sử điểm →</Link></div>
          {recent.length === 0 ? <p className="mt-2 text-xs text-muted">Bạn chưa nhận điểm từ trò chơi nào. Chơi một trò bên dưới để bắt đầu nhé!</p> : (
            <ul className="mt-2 divide-y divide-border">{recent.map((r) => <li key={r.id} className="flex items-center justify-between gap-3 py-1.5 text-sm"><span className="min-w-0 truncate">{r.reason.replace(/^Trò chơi: /, "🎮 ")}</span><span className="shrink-0 text-xs text-muted">{formatDate(r.createdAt)}</span><b className="w-10 shrink-0 text-right text-emerald-600">+{r.points}</b></li>)}</ul>
          )}
        </div>
      )}
      {quizzes.length === 0 ? (
        <div className="rounded-lg border border-border bg-white/85"><EmptyState title="Chưa có trò chơi" description="Ban chấp hành sẽ đăng trò chơi mới mỗi tuần. Hãy quay lại nhé!" /></div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {quizzes.map((q) => {
            const th = themeOf(q.theme); const a = by.get(q.id);
            const ended = !!q.endsAt && q.endsAt < now;
            const state = a?.finishedAt ? "done" : a ? "resume" : ended ? "ended" : "new";
            return (
              <Link key={q.id} href={`/games/${q.id}`} className="group flex flex-col overflow-hidden rounded-xl border border-border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className={cn("relative flex items-center gap-3 bg-gradient-to-br px-4 py-5 text-white", th.grad)}>
                  <span className="text-4xl">{th.emoji}</span>
                  <div className="min-w-0"><div className="line-clamp-2 text-lg leading-tight font-bold">{q.title}</div><div className="text-xs opacity-90">{th.label}</div></div>
                </div>
                <div className="flex flex-1 flex-col gap-2 p-3 text-sm">
                  {q.description && <p className="line-clamp-2 text-slate-600">{q.description}</p>}
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted"><span>{q._count.questions} câu</span><span>{q.secondsPerQuestion}s/câu</span><span className="font-semibold text-emerald-600">{q.points ? `+${q.points} điểm` : "Chơi cho vui"}</span>{q.endsAt && <span>Hạn {formatDate(q.endsAt)}</span>}</div>
                  <div className="mt-auto pt-1">
                    {state === "done" && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">✓ Đã chơi: {a!.correctCount}/{a!.total} · +{a!.pointsAwarded} điểm</span>}
                    {state === "resume" && <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700"><Flame className="size-3.5" />Đang chơi dở: tiếp tục</span>}
                    {state === "ended" && <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500"><Lock className="size-3.5" />Đã kết thúc</span>}
                    {state === "new" && <span className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-white group-hover:bg-primary-dark">Chơi ngay →</span>}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
