import { getT } from "@/lib/i18n/server";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { getGameCap, gamePointsThisWeek, loadPlayState, quizAllows } from "@/lib/services/games";
import { PageHeader } from "@/components/ui/misc";
import { QuizPlayer } from "@/components/games/quiz-player";

export async function generateMetadata() { return { title: (await getT())("cms.qr.playTitle") }; }

export default async function PlayPage({ params }: { params: Promise<{ id: string }> }) {
  const t = await getT();
  const user = await requireUser();
  const { id } = await params;
  const quiz = await db.quiz.findFirst({ where: { id, published: true }, include: { _count: { select: { questions: true } } } });
  if (!quiz) notFound();
  const now = new Date();
  const [cap, used] = await Promise.all([getGameCap(), user.memberId ? gamePointsThisWeek(user.memberId) : 0]);
  const attempt = user.memberId ? await db.quizAttempt.findUnique({ where: { quizId_memberId: { quizId: id, memberId: user.memberId } } }) : null;
  const initial = attempt && user.memberId ? await loadPlayState(attempt.id, user.memberId) : null;
  let blocked: string | undefined;
  if (!user.memberId) blocked = t("cms.qr.b.admin");
  else if (!initial && !quizAllows(quiz, user.departmentId)) blocked = t("cms.qr.b.other");
  else if (!initial?.finished && quiz.startsAt && quiz.startsAt > now) blocked = t("cms.qr.b.notOpen");
  else if (!initial && quiz.endsAt && quiz.endsAt < now) blocked = t("cms.qr.b.ended");
  else if (!initial && quiz._count.questions === 0) blocked = t("cms.qr.b.noQ");
  return (
    <>
      <PageHeader title={quiz.title} />
      <QuizPlayer info={{ id: quiz.id, title: quiz.title, description: quiz.description, theme: quiz.theme, points: quiz.points, seconds: quiz.secondsPerQuestion, total: quiz._count.questions, endsAt: quiz.endsAt?.toISOString() ?? null }}
        initial={initial} cap={cap} used={used} blocked={blocked} />
    </>
  );
}
