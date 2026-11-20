import { getT } from "@/lib/i18n/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/misc";
import { MarqueeManager } from "@/components/cms/marquee-manager";

export async function generateMetadata() { return { title: (await getT())("cms.sp.mqTitle") }; }

export default async function CmsMarqueePage() {
  const t = await getT();
  await requireRole(["ADMIN"]);
  const items = await db.marqueeItem.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true, text: true, link: true, active: true } });
  return (<><PageHeader title={t("cms.sp.mqTitle")} description={t("cms.sp.mqDesc")} /><MarqueeManager items={items} /></>);
}
