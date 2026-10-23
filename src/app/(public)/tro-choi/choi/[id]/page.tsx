import Link from "next/link";
import { notFound } from "next/navigation";
import { LogIn } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getGameCap, gamePointsThisWeek, loadPlayState, quizAllows } from "@/lib/services/games";
import { PageTitle } from "@/components/public/blocks";
import { QuizPlayer } from "@/components/games/quiz-player";
import { themeOf } from "@/components/games/game-meta";
import { cn } from "@/utils";

export const metadata = { title: "Chơi trò chơi" };

export default async function PublicPlayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const quiz = await db.quiz.findFirst({ where: { id, published: true }, include: { _count: { select: { questions: true } } } });
  if (!quiz) notFound();
  const user = await getCurrentUser();
  const th = themeOf(quiz.theme);
  const info = { id: quiz.id, title: quiz.title, description: quiz.description, theme: quiz.theme, points: quiz.points, seconds: quiz.secondsPerQuestion, total: quiz._count.questions, endsAt: quiz.endsAt?.toISOString() ?? null };

  // Khách: giới thiệu trò chơi và mời đăng nhập (đăng nhập xong quay lại đúng trang này)
  if (!user) {
    return (
      <>
        <PageTitle title={quiz.title} description="Đăng nhập bằng tài khoản đoàn viên hoặc thanh niên để chơi và tích điểm" />
        <div className="mx-auto max-w-xl overflow-hidden rounded-xl border border-border bg-white shadow-sm">
          <div className={cn("bg-gradient-to-br px-6 py-8 text-center text-white", th.grad)}><div className="text-6xl">{th.emoji}</div><h2 className="mt-2 text-2xl font-bold">{quiz.title}</h2><p className="mt-1 text-sm opacity-90">{th.label}</p></div>
          <div className="space-y-3 p-5 text-sm">
            {quiz.description && <p className="text-slate-700">{quiz.description}</p>}
            <p className="text-slate-600">{info.total} câu · {info.seconds} giây mỗi câu · {quiz.points ? `tối đa +${quiz.points} điểm cho Chi đoàn` : "chơi cho vui"}</p>
            <Link href={`/login?next=${encodeURIComponent(`/tro-choi/choi/${id}`)}`} className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary text-base font-bold text-white shadow hover:bg-primary-dark"><LogIn className="size-5" />Đăng nhập để chơi</Link>
            <Link href="/tro-choi" className="block text-center text-sm text-muted hover:text-primary">← Xem các trò chơi khác</Link>
          </div>
        </div>
      </>
    );
  }

  const now = new Date();
  const [cap, used] = await Promise.all([getGameCap(), user.memberId ? gamePointsThisWeek(user.memberId) : 0]);
  const attempt = user.memberId ? await db.quizAttempt.findUnique({ where: { quizId_memberId: { quizId: id, memberId: user.memberId } } }) : null;
  const initial = attempt && user.memberId ? await loadPlayState(attempt.id, user.memberId) : null;
  let blocked: string | undefined;
  if (!user.memberId) blocked = "Tài khoản quản trị không chơi để tích điểm. Hãy dùng tài khoản đoàn viên để chơi.";
  else if (!initial && !quizAllows(quiz, user.departmentId)) blocked = "Trò chơi này dành cho Chi đoàn khác.";
  else if (!initial?.finished && quiz.startsAt && quiz.startsAt > now) blocked = "Trò chơi này chưa mở. Hãy quay lại sau nhé!";
  else if (!initial && quiz.endsAt && quiz.endsAt < now) blocked = "Trò chơi này đã kết thúc.";
  else if (!initial && quiz._count.questions === 0) blocked = "Trò chơi chưa có câu hỏi.";
  return (
    <>
      <PageTitle title={quiz.title} />
      <QuizPlayer info={info} initial={initial} cap={cap} used={used} blocked={blocked} listHref="/tro-choi" />
    </>
  );
}
