import { getT } from "@/lib/i18n/server";
import { requireRole } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/misc";
import { MenuEditor } from "@/components/cms/menu-editor";
import { getMenuConfig } from "@/lib/services/site-settings";

export async function generateMetadata() { return { title: (await getT())("cms.sp.menuTitle") }; }

export default async function CmsMenuPage() {
  const t = await getT();
  await requireRole(["ADMIN"]);
  const menu = await getMenuConfig();
  return (<><PageHeader title={t("cms.sp.menuTitle")} description={t("cms.sp.menuDesc")} /><MenuEditor initial={menu} /></>);
}
