import { getT } from "@/lib/i18n/server";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { SITE_PAGES } from "@/lib/services/public";
import { formatDate } from "@/utils";
import { buttonClass } from "@/components/ui/button";
import { DataTable, PageHeader, Td, Th } from "@/components/ui/misc";

export async function generateMetadata() { return { title: (await getT())("cms.sp.pagesTitle") }; }

export default async function CmsPagesPage() {
  const t = await getT();
  await requireRole(["ADMIN"]);
  const pages = await db.sitePage.findMany();
  const bySlug = new Map(pages.map((p) => [p.slug, p]));
  return (
    <>
      <PageHeader title={t("cms.sp.pagesTitle")} description={t("cms.sp.pagesDesc")} />
      <DataTable>
        <thead><tr><Th>{t("cms.sp.thPage")}</Th><Th>{t("cms.sp.thStructure")}</Th><Th>{t("cms.sp.thUpdated")}</Th><Th /></tr></thead>
        <tbody>{Object.entries(SITE_PAGES).map(([slug, title]) => (
          <tr key={slug}>
            <Td className="font-medium">{title}</Td>
            <Td className="text-muted">{(() => { const tb = bySlug.get(slug)?.tabs; return Array.isArray(tb) && tb.length ? t("cms.sp.nTabs", { n: tb.length }) : t("cms.sp.single"); })()}</Td>
            <Td>{bySlug.get(slug) ? formatDate(bySlug.get(slug)!.updatedAt) : t("cms.sp.noContent")}</Td>
            <Td className="text-right"><Link href={`/cms/pages/${slug}`} className={buttonClass("secondary", "sm")}><Pencil className="size-3.5" />{t("cms.c.edit")}</Link></Td>
          </tr>
        ))}</tbody>
      </DataTable>
    </>
  );
}
