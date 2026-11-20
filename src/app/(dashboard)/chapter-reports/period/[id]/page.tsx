import { getT } from "@/lib/i18n/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, FileText } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { formatDate } from "@/utils";
import { PageHeader } from "@/components/ui/misc";
import { buttonClass } from "@/components/ui/button";
import { PeriodDetailTracker } from "@/components/cms/period-detail-tracker";
import { PeriodModalButton } from "@/components/cms/period-modal";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await db.reportPeriod.findUnique({ where: { id }, select: { title: true } });
  const t = await getT();
  return { title: p ? t("cms.cr.trackerTitle", { title: p.title }) : t("cms.cr.trackerDefault") };
}

export default async function PeriodReportTrackerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = await getT();
  const user = await requireRole(["ADMIN"]);
  const { id } = await params;

  const [period, departments, reports, schoolYearRows] = await Promise.all([
    db.reportPeriod.findUnique({
      where: { id },
      include: { _count: { select: { reports: true } } },
    }),
    db.department.findMany({
      where: { graduatedAt: null },
      orderBy: { name: "asc" },
      include: {
        secretary: {
          select: { id: true, fullName: true, username: true, position: true },
        },
        _count: { select: { members: { where: { status: "ACTIVE" } } } },
      },
    }),
    db.chapterReport.findMany({
      where: { periodId: id },
      select: { id: true, departmentId: true, title: true, createdAt: true, viewCount: true, participantCount: true },
    }),
    db.schoolYear.findMany({ orderBy: { startYear: "desc" } }),
  ]);

  if (!period) notFound();

  const schoolYears = schoolYearRows.map((s) => `${s.startYear}-${s.startYear + 1}`);

  const reportMap = new Map(reports.map((r) => [r.departmentId, r]));

  const trackerItems = departments.map((d) => ({
    department: d,
    memberCount: d._count.members,
    report: reportMap.get(d.id) ?? null,
  }));

  const subtitle = [
    period.academicYear ? t("cms.cr.yearSub", { y: period.academicYear }) : null,
    period.startDate ? t("cms.cr.from", { d: formatDate(period.startDate) }) : null,
    period.endDate ? t("cms.cr.deadline", { d: formatDate(period.endDate) }) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="text-xs text-muted">
          <Link href="/chapter-reports" className="inline-flex items-center gap-1 hover:text-primary">
            <ArrowLeft className="size-3.5" />
            {t("cms.cr.backList")}
          </Link>
        </nav>
      </div>

      <PageHeader
        title={period.title}
        description={subtitle || t("cms.cr.trackDesc")}
        actions={
          <div className="flex items-center gap-2">
            <PeriodModalButton
              period={period}
              schoolYears={schoolYears}
              trigger={
                <button type="button" className={buttonClass("secondary")}>
                  {t("cms.cr.editPeriod")}
                </button>
              }
            />
            <Link href={`/chapter-reports/new?periodId=${period.id}`} className={buttonClass()}>
              <FileText className="size-4" />
              {t("cms.cr.postFor")}
            </Link>
          </div>
        }
      />

      {period.description && (
        <div className="rounded-xl border border-primary/20 bg-primary-light/40 p-4 text-sm">
          <div className="font-semibold mb-1 flex items-center gap-1.5 text-primary">
            <Calendar className="size-4" /> {t("cms.cr.guide")}
          </div>
          <p className="whitespace-pre-line text-foreground/90">{period.description}</p>
        </div>
      )}

      <PeriodDetailTracker period={period} items={trackerItems} />
    </div>
  );
}

