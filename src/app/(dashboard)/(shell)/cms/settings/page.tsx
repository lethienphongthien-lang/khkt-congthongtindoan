import { getT } from "@/lib/i18n/server";
import { requireRole } from "@/lib/auth/session";
import { getSiteSettings } from "@/lib/services/site-settings";
import { PageHeader } from "@/components/ui/misc";
import { SiteSettingsForm } from "@/components/cms/site-settings-form";

export async function generateMetadata() { return { title: (await getT())("cms.sp.siteTitle") }; }

export default async function CmsSettingsPage() {
  const t = await getT();
  await requireRole(["ADMIN"]);
  return (
    <>
      <PageHeader title={t("cms.sp.siteTitle")} description={t("cms.sp.siteDesc")} />
      <SiteSettingsForm initial={await getSiteSettings()} />
    </>
  );
}
