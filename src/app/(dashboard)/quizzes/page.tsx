import { getT } from "@/lib/i18n/server";
import Link from "next/link";
import { Plus } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { formatDate } from "@/utils";
import { buttonClass } from "@/components/ui/button";
import { ClickRow } from "@/components/ui/click-row";
import { DataTable, EmptyState, PageHeader, StatusBadge, Td, Th } from "@/components/ui/misc";
import { QuizRowActions } from "@/components/games/quiz-admin";
import { themeOf } from "@/components/games/game-meta";

export async function generateMetadata() { return { title: (await getT())("cms.quizzes.title") }; }

export default async function QuizzesPage() {
  const t = await getT();
  await requireRole(["ADMIN"]);
  const quizzes = await db.quiz.findMany({ orderBy: { createdAt: "desc" }, take: 50, include: { _count: { select: { questions: true, attempts: true } } } });
  const now = new Date();
  const status = (q: (typeof quizzes)[number]) => !q.published ? <StatusBadge tone="gray">{t("cms.quizzes.hidden")}</StatusBadge> : q.startsAt && q.startsAt > now ? <StatusBadge tone="amber">{t("cms.quizzes.notOpen")}</StatusBadge> : q.endsAt && q.endsAt < now ? <StatusBadge tone="gray">{t("cms.quizzes.expired")}</StatusBadge> : <StatusBadge tone="green">{t("cms.quizzes.open")}</StatusBadge>;
  return (
    <>
      <PageHeader title={t("cms.quizzes.title")} description={t("cms.quizzes.desc")}
        actions={<Link href="/quizzes/new" className={buttonClass()}><Plus className="size-4" />{t("cms.quizzes.create")}</Link>} />
      {quizzes.length === 0 ? <div className="rounded-lg border border-border bg-white/85"><EmptyState title={t("cms.quizzes.emptyTitle")} description={t("cms.quizzes.emptyDesc")} action={<Link href="/quizzes/new" className={buttonClass()}>{t("cms.quizzes.createFirst")}</Link>} /></div> : (
        <DataTable>
          <thead><tr><Th>{t("cms.quizzes.thGame")}</Th><Th>{t("cms.quizzes.thAudience")}</Th><Th>{t("cms.quizzes.thQs")}</Th><Th>{t("cms.quizzes.thPoints")}</Th><Th>{t("cms.quizzes.thPlays")}</Th><Th>{t("cms.quizzes.thDeadline")}</Th><Th>{t("cms.quizzes.thStatus")}</Th><Th /></tr></thead>
          <tbody>{quizzes.map((q) => (
            <ClickRow key={q.id} href={`/quizzes/${q.id}`}>
              <Td className="max-w-md font-medium"><Link href={`/quizzes/${q.id}`} className="hover:text-primary">{themeOf(q.theme, t).emoji} {q.title}</Link></Td>
              <Td className="whitespace-nowrap text-sm">{q.departmentIds.length === 0 ? t("cms.quizzes.wholeSchool") : t("cms.quizzes.nChapters", { n: q.departmentIds.length })}</Td>
              <Td>{q._count.questions}</Td><Td>{q.points}</Td><Td>{q._count.attempts}</Td>
              <Td className="whitespace-nowrap">{q.endsAt ? formatDate(q.endsAt) : "—"}</Td>
              <Td>{status(q)}</Td>
              <Td className="text-right whitespace-nowrap"><QuizRowActions id={q.id} published={q.published} /></Td>
            </ClickRow>
          ))}</tbody>
        </DataTable>
      )}
    </>
  );
}
