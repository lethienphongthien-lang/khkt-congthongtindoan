import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { formatDateTime } from "@/utils";
import { buttonClass } from "@/components/ui/button";
import { DataTable, EmptyState, PageHeader, Stat, Td, Th } from "@/components/ui/misc";
import { themeOf } from "@/components/games/game-meta";

export const metadata = { title: "Kết quả trò chơi" };

export default async function QuizResultsPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["ADMIN"]);
  const { id } = await params;
  const quiz = await db.quiz.findUnique({ where: { id }, include: { questions: { orderBy: { position: "asc" }, select: { id: true, text: true, kind: true } } } });
  if (!quiz) notFound();
  const [attempts, perQuestion] = await Promise.all([
    db.quizAttempt.findMany({ where: { quizId: id }, orderBy: [{ correctCount: "desc" }, { bestStreak: "desc" }, { finishedAt: "asc" }], take: 100, include: { member: { select: { fullName: true, code: true, department: { select: { name: true } } } } } }),
    db.quizAnswer.groupBy({ by: ["questionId", "correct"], where: { attempt: { quizId: id } }, _count: true }),
  ]);
  const done = attempts.filter((a) => a.finishedAt);
  const avg = done.length ? Math.round((done.reduce((s, a) => s + a.correctCount / Math.max(1, a.total), 0) / done.length) * 100) : 0;
  const pts = done.reduce((s, a) => s + a.pointsAwarded, 0);
  const acc = (qid: string) => { const c = perQuestion.filter((r) => r.questionId === qid); const ok = c.find((r) => r.correct)?._count ?? 0; const all = c.reduce((s, r) => s + r._count, 0); return all ? Math.round((ok / all) * 100) : null; };
  const th = themeOf(quiz.theme);
  return (
    <>
      <PageHeader title={`${th.emoji} ${quiz.title}`} description={`${th.label} · ${quiz.questions.length} câu · ${quiz.secondsPerQuestion}s/câu · tối đa ${quiz.points} điểm`}
        actions={<Link href={`/quizzes/${id}/edit`} className={buttonClass("secondary")}><Pencil className="size-4" />Sửa</Link>} />
      <div className="mb-5 grid grid-cols-2 gap-6 sm:grid-cols-4">
        <Stat label="Lượt chơi" value={attempts.length} hint={`${done.length} đã hoàn thành`} /><Stat label="Tỉ lệ đúng trung bình" value={`${avg}%`} /><Stat label="Điểm đã cộng" value={pts} /><Stat label="Đang chơi dở" value={attempts.length - done.length} />
      </div>
      <h3 className="mb-2 text-base font-semibold">Độ khó từng câu</h3>
      <div className="mb-6 space-y-1.5 rounded-lg border border-border bg-white/85 p-3">
        {quiz.questions.map((q, i) => { const a = acc(q.id); return (
          <div key={q.id} className="flex items-center gap-3 text-sm"><span className="w-6 text-center font-semibold text-muted">{i + 1}</span><span className="min-w-0 flex-1 truncate">{q.text}</span>
            <div className="h-2 w-32 overflow-hidden rounded-full bg-slate-100"><div className={`h-full ${a !== null && a < 40 ? "bg-rose-400" : "bg-emerald-500"}`} style={{ width: `${a ?? 0}%` }} /></div><span className="w-10 text-right tabular-nums text-muted">{a === null ? "—" : `${a}%`}</span></div>
        ); })}
      </div>
      <h3 className="mb-2 text-base font-semibold">Bảng xếp hạng</h3>
      {attempts.length === 0 ? <div className="rounded-lg border border-border bg-white/85"><EmptyState title="Chưa có ai chơi" /></div> : (
        <DataTable>
          <thead><tr><Th>#</Th><Th>Đoàn viên</Th><Th>Chi đoàn</Th><Th>Đúng</Th><Th>Chuỗi</Th><Th>Điểm nhận</Th><Th>Hoàn thành</Th></tr></thead>
          <tbody>{attempts.map((a, i) => (
            <tr key={a.id}><Td>{i + 1}</Td><Td className="font-medium">{a.member.fullName} <span className="text-xs text-muted">{a.member.code}</span></Td><Td>{a.member.department.name}</Td><Td>{a.finishedAt ? `${a.correctCount}/${a.total}` : "đang chơi"}</Td><Td>{a.bestStreak}</Td><Td>{a.pointsAwarded}</Td><Td className="whitespace-nowrap">{a.finishedAt ? formatDateTime(a.finishedAt) : "—"}</Td></tr>
          ))}</tbody>
        </DataTable>
      )}
    </>
  );
}
