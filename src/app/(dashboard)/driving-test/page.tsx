import { requireUser } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/misc";
import { GplxPractice } from "@/components/gplx/practice";

export const metadata = { title: "Ôn thi lái xe" };

export default async function DrivingTestPage() {
  await requireUser();
  return (
    <>
      <PageHeader title="Ôn thi lý thuyết lái xe" description="Bộ 600 câu hỏi sát hạch của Cục Cảnh sát giao thông (Bộ Công an), áp dụng từ 01/6/2025" />
      <GplxPractice />
    </>
  );
}
