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

export const metadata = { title: "Trò chơi tích điểm" };

export default async function QuizzesPage() {
  await requireRole(["ADMIN"]);
  const quizzes = await db.quiz.findMany({ orderBy: { createdAt: "desc" }, take: 50, include: { _count: { select: { questions: true, attempts: true } } } });
  const now = new Date();
  const status = (q: (typeof quizzes)[number]) => !q.published ? <StatusBadge tone="gray">Đã ẩn</StatusBadge> : q.startsAt && q.startsAt > now ? <StatusBadge tone="amber">Chưa mở</StatusBadge> : q.endsAt && q.endsAt < now ? <StatusBadge tone="gray">Hết hạn</StatusBadge> : <StatusBadge tone="green">Đang mở</StatusBadge>;
  return (
    <>
      <PageHeader title="Trò chơi tích điểm" description="Đố vui hằng tuần: đoàn viên chơi để tích điểm vào thi đua Chi đoàn"
        actions={<Link href="/quizzes/new" className={buttonClass()}><Plus className="size-4" />Tạo trò chơi</Link>} />
      {quizzes.length === 0 ? <div className="rounded-lg border border-border bg-white/85"><EmptyState title="Chưa có trò chơi" description="Có thể nhờ AI soạn sẵn câu hỏi theo chủ đề, bạn chỉ cần đọc lại và chỉnh sửa." action={<Link href="/quizzes/new" className={buttonClass()}>Tạo trò chơi đầu tiên</Link>} /></div> : (
        <DataTable>
          <thead><tr><Th>Trò chơi</Th><Th>Đối tượng</Th><Th>Câu</Th><Th>Điểm</Th><Th>Lượt chơi</Th><Th>Hạn</Th><Th>Trạng thái</Th><Th /></tr></thead>
          <tbody>{quizzes.map((q) => (
            <ClickRow key={q.id} href={`/quizzes/${q.id}`}>
              <Td className="max-w-md font-medium"><Link href={`/quizzes/${q.id}`} className="hover:text-primary">{themeOf(q.theme).emoji} {q.title}</Link></Td>
              <Td className="whitespace-nowrap text-sm">{q.departmentIds.length === 0 ? "Toàn trường" : `${q.departmentIds.length} Chi đoàn`}</Td>
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
