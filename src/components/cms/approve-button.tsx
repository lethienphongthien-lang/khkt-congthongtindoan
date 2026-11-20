"use client";
import { useT } from "@/lib/i18n/client";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { setArticlePublishedAction } from "@/actions/cms";
import { ConfirmButton } from "@/components/ui/modal";
import { reportResult } from "@/components/ui/submit";

/** Admin duyệt bài nháp của bí thư: bấm là hiển thị công khai. */
export function ApproveButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const t = useT();
  return (
    <ConfirmButton triggerVariant="primary" trigger={<><Check className="size-4" /><span className="max-sm:hidden">{t("cms.approve.btn")}</span></>} triggerLabel={t("cms.approve.label")} title={t("cms.approve.title")} description={t("cms.approve.desc", { title })} confirmLabel={t("cms.approve.btn")}
      onConfirm={async () => { reportResult(await setArticlePublishedAction(id, true)); router.refresh(); }} />
  );
}
