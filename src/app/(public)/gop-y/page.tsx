import { PageTitle } from "@/components/public/blocks";
import { FeedbackForm } from "@/components/feedback/feedback-form";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata() {
  return { title: (await getT())("community.fb.metaTitle") };
}

export default async function FeedbackPage() {
  const t = await getT();
  return (
    <>
      <PageTitle title={t("community.fb.title")} description={t("community.fb.desc")} />
      <div className="max-w-2xl"><FeedbackForm /></div>
    </>
  );
}
