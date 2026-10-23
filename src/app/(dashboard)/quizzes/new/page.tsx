import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/misc";
import { QuizForm } from "@/components/games/quiz-form";
import { emptyQuiz } from "@/components/games/quiz-defaults";

export const metadata = { title: "Tạo trò chơi" };

export default async function NewQuizPage() {
  await requireRole(["ADMIN"]);
  const departments = await db.department.findMany({ where: { graduatedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } });
  return (<><PageHeader title="Tạo trò chơi" description="Soạn các câu hỏi ở bên trái, thiết lập ở bên phải. Đoàn viên chơi, máy chủ chấm và cộng điểm tự động." /><QuizForm initial={emptyQuiz()} departments={departments} /></>);
}
