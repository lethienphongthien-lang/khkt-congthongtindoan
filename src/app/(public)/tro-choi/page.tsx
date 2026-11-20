import Link from "next/link";
import { listPublicQuizzes } from "@/lib/services/games";
import { getCurrentUser } from "@/lib/auth/session";
import { EmptyPublic, PageTitle } from "@/components/public/blocks";
import { QuizCards } from "@/components/public/quiz-cards";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata() {
  return { title: (await getT())("menu.tro-choi") };
}

export default async function Page() {
  const t = await getT();
  const user = await getCurrentUser();
  const quizzes = await listPublicQuizzes(30, user ? { departmentId: user.departmentId, memberId: user.memberId, isAdmin: !user.memberId } : null);
  return (
    <>
      <PageTitle title={t("menu.tro-choi")} description={t("community.game.desc")}
        actions={user?.memberId ? <Link href="/games" className="text-sm font-medium text-primary hover:underline">{t("community.game.myScores")}</Link> : !user ? <p className="text-sm text-muted">{t("community.game.loginPrompt1")} <Link href="/login?next=/tro-choi" className="font-medium text-primary hover:underline">{t("common.login")}</Link> {t("community.game.loginPrompt2")}</p> : undefined} />
      {quizzes.length === 0 ? <div className="rounded border border-border bg-white/85"><EmptyPublic text={t("community.game.empty")} /></div> : <QuizCards items={quizzes} />}
    </>
  );
}
