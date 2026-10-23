import { PageTitle } from "@/components/public/blocks";
import { FeedbackForm } from "@/components/feedback/feedback-form";

export const metadata = { title: "Góp ý – Hộp thư ẩn danh" };

export default function FeedbackPage() {
  return (
    <>
      <PageTitle title="Hộp thư góp ý" description="Gửi ý kiến, đề xuất cho Đoàn trường. Bạn không cần đăng nhập và không bị lộ danh tính." />
      <div className="max-w-2xl"><FeedbackForm /></div>
    </>
  );
}
