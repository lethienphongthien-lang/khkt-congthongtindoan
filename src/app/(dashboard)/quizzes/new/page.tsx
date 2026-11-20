import { getT } from "@/lib/i18n/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/misc";
import { QuizForm } from "@/components/games/quiz-form";
import { emptyQuiz } from "@/components/games/quiz-defaults";

export async function generateMetadata() { return { title: (await getT())("cms.qr.newTitle") }; }

export default async function NewQuizPage() {
  const t = await getT();
  await requireRole(["ADMIN"]);
  const departments = await db.department.findMany({ where: { graduatedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } });
  return (<><PageHeader title={t("cms.qr.newTitle")} description={t("cms.qr.newDesc")} /><QuizForm initial={emptyQuiz()} departments={departments} /></>);
}
