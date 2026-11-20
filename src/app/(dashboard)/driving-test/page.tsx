import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/misc";
import { GplxPractice } from "@/components/gplx/practice";

export async function generateMetadata() { return { title: (await getT())("cms.driving.title") }; }

export default async function DrivingTestPage() {
  const t = await getT();
  await requireUser();
  return (
    <>
      <PageHeader title={t("cms.driving.heading")} description={t("cms.driving.desc")} />
      <GplxPractice />
    </>
  );
}
