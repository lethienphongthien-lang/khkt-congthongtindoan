import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { getGameCap, gamePointsThisWeek, loadPlayState, quizAllows } from "@/lib/services/games";
import { PageHeader } from "@/components/ui/misc";
import { QuizPlayer } from "@/components/games/quiz-player";

export const metadata = { title: "Chơi trò chơi" };

export default async function PlayPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const quiz = await db.quiz.findFirst({ where: { id, published: true }, include: { _count: { select: { questions: true } } } });
  if (!quiz) notFound();
  const now = new Date();
  const [cap, used] = await Promise.all([getGameCap(), user.memberId ? gamePointsThisWeek(user.memberId) : 0]);
  const attempt = user.memberId ? await db.quizAttempt.findUnique({ where: { quizId_memberId: { quizId: id, memberId: user.memberId } } }) : null;
  const initial = attempt && user.memberId ? await loadPlayState(attempt.id, user.memberId) : null;
  let blocked: string | undefined;
  if (!user.memberId) blocked = "Tài khoản quản trị không chơi để tích điểm. Hãy dùng tài khoản đoàn viên để chơi thử.";
  else if (!initial && !quizAllows(quiz, user.departmentId)) blocked = "Trò chơi này dành cho Chi đoàn khác.";
  else if (!initial?.finished && quiz.startsAt && quiz.startsAt > now) blocked = "Trò chơi này chưa mở. Hãy quay lại sau nhé!";
  else if (!initial && quiz.endsAt && quiz.endsAt < now) blocked = "Trò chơi này đã kết thúc.";
  else if (!initial && quiz._count.questions === 0) blocked = "Trò chơi chưa có câu hỏi.";
  return (
    <>
      <PageHeader title={quiz.title} />
      <QuizPlayer info={{ id: quiz.id, title: quiz.title, description: quiz.description, theme: quiz.theme, points: quiz.points, seconds: quiz.secondsPerQuestion, total: quiz._count.questions, endsAt: quiz.endsAt?.toISOString() ?? null }}
        initial={initial} cap={cap} used={used} blocked={blocked} />
    </>
  );
}
