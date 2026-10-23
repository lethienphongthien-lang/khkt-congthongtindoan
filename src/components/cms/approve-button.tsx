"use client";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { setArticlePublishedAction } from "@/actions/cms";
import { ConfirmButton } from "@/components/ui/modal";
import { reportResult } from "@/components/ui/submit";

/** Admin duyệt bài nháp của bí thư: bấm là hiển thị công khai. */
export function ApproveButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  return (
    <ConfirmButton triggerVariant="primary" trigger={<><Check className="size-4" /><span className="max-sm:hidden">Duyệt &amp; đăng</span></>} triggerLabel="Duyệt và đăng" title="Duyệt và đăng bài?" description={`“${title}” sẽ hiển thị trên trang công khai ngay.`} confirmLabel="Duyệt & đăng"
      onConfirm={async () => { reportResult(await setArticlePublishedAction(id, true)); router.refresh(); }} />
  );
}
