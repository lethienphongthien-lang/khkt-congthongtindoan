import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { toLocalInput } from "@/utils";
import { PageHeader } from "@/components/ui/misc";
import { QuizForm } from "@/components/games/quiz-form";
import type { QForm } from "@/components/games/quiz-defaults";

export const metadata = { title: "Sửa trò chơi" };

export default async function EditQuizPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["ADMIN"]);
  const { id } = await params;
  const q = await db.quiz.findUnique({ where: { id }, include: { questions: { orderBy: { position: "asc" } }, _count: { select: { attempts: true } } } });
  if (!q) notFound();
  const departments = await db.department.findMany({ where: { graduatedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } });
  const questions: QForm[] = q.questions.map((x) => {
    const options = Array.isArray(x.options) ? x.options.map(String) : [];
    const isTf = x.kind === "CHOICE" && options.length === 2 && options[0] === "Đúng" && options[1] === "Sai";
    return { ui: isTf ? "TF" : x.kind, text: x.text, image: x.imageUrl && x.imagePublicId ? { imageUrl: x.imageUrl, publicId: x.imagePublicId } : null, options, correct: x.correct, explanation: x.explanation ?? "" };
  });
  return (
    <>
      <PageHeader title="Sửa trò chơi" />
      <QuizForm id={q.id} locked={q._count.attempts > 0} departments={departments}
        initial={{ title: q.title, description: q.description ?? "", theme: q.theme, points: q.points, seconds: q.secondsPerQuestion, startsAt: q.startsAt ? toLocalInput(q.startsAt) : "", endsAt: q.endsAt ? toLocalInput(q.endsAt) : "", published: q.published, notify: false, departmentIds: q.departmentIds, questions }} />
    </>
  );
}
