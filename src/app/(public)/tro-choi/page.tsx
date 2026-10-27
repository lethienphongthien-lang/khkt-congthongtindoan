import Link from "next/link";
import { listPublicQuizzes } from "@/lib/services/games";
import { getCurrentUser } from "@/lib/auth/session";
import { EmptyPublic, PageTitle } from "@/components/public/blocks";
import { QuizCards } from "@/components/public/quiz-cards";

export const metadata = { title: "Góc giải trí" };

export default async function Page() {
  const user = await getCurrentUser();
  const quizzes = await listPublicQuizzes(30, user ? { departmentId: user.departmentId, memberId: user.memberId, isAdmin: !user.memberId } : null);
  return (
    <>
      <PageTitle title="Góc giải trí" description="Đố vui và các trò chơi giải trí mới mỗi tuần do Ban chấp hành đăng. Đoàn viên và thanh niên đăng nhập để chơi, tích điểm cho bản thân và cho Chi đoàn"
        actions={user?.memberId ? <Link href="/games" className="text-sm font-medium text-primary hover:underline">Xem điểm và bảng xếp hạng của tôi →</Link> : !user ? <p className="text-sm text-muted">Đoàn viên, thanh niên <Link href="/login?next=/tro-choi" className="font-medium text-primary hover:underline">đăng nhập</Link> để chơi và tích điểm.</p> : undefined} />
      {quizzes.length === 0 ? <div className="rounded border border-border bg-white/85"><EmptyPublic text="Chưa có trò chơi nào đang mở. Hãy quay lại sau nhé!" /></div> : <QuizCards items={quizzes} />}
    </>
  );
}
