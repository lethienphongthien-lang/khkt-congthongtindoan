import { PageTitle } from "@/components/public/blocks";
import { GplxPractice } from "@/components/gplx/practice";

export const metadata = { title: "Ôn thi lý thuyết giấy phép lái xe" };

export default function Page() {
  return (
    <>
      <PageTitle title="Ôn thi lý thuyết giấy phép lái xe" description="Bộ 600 câu hỏi sát hạch lái xe cơ giới đường bộ do Cục Cảnh sát giao thông (Bộ Công an) biên soạn, áp dụng từ 01/6/2025. Đáp án theo bản gốc của Cục." />
      <GplxPractice />
    </>
  );
}
