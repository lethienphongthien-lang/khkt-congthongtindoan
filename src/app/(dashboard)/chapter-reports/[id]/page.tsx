import { getT, getLocale } from "@/lib/i18n/server";
import { intlLocale } from "@/lib/i18n/format";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { canManageDepartment } from "@/lib/permissions";
import { formatDate } from "@/utils";
import { buttonClass } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/misc";
import { ReportRowActions } from "@/components/cms/row-actions";
import { RichText } from "@/components/public/rich-text";

export async function generateMetadata() { return { title: (await getT())("cms.crp.title") }; }

export default async function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const t = await getT();
  const locale = await getLocale();
  const user = await requireRole(["ADMIN", "SECRETARY", "DEPARTMENT_ACCOUNT"]);
  const r = await db.chapterReport.findUnique({
    where: { id: (await params).id },
    include: {
      department: { select: { name: true } },
      period: { select: { id: true, title: true } },
    },
  });
  if (!r || !canManageDepartment(user, r.departmentId)) notFound();
  const desc = [
    t("cms.crp.dChapter", { name: r.department.name }),
    r.period ? t("cms.crp.dPeriod", { title: r.period.title }) : null,
    r.participantCount != null ? t("cms.crp.dParts", { n: r.participantCount }) : null,
    formatDate(r.createdAt),
    t("cms.crp.dViews", { n: r.viewCount.toLocaleString(intlLocale(locale)) }),
  ].filter(Boolean).join(" · ");

  return (
    <>
      <PageHeader title={r.title} stackActions description={desc}
        actions={<>
          <Link href={`/bao-cao-chi-doan/bao-cao/${r.id}`} target="_blank" className={buttonClass("secondary")}><ExternalLink className="size-4" /><span className="max-sm:hidden">{t("cms.crp.viewPublic")}</span></Link>
          <ReportRowActions id={r.id} backToList />
        </>} />
      {r.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={r.imageUrl} alt="" className="mb-4 max-h-96 w-full rounded-lg object-cover" />
      )}
      <RichText text={r.content} />
    </>
  );
}
