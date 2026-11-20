import { PageTitle } from "@/components/public/blocks";
import { GplxPractice } from "@/components/gplx/practice";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata() {
  return { title: (await getT())("community.gplx.title") };
}

export default async function Page() {
  const t = await getT();
  return (
    <>
      <PageTitle title={t("community.gplx.title")} description={t("community.gplx.desc")} />
      <GplxPractice />
    </>
  );
}
