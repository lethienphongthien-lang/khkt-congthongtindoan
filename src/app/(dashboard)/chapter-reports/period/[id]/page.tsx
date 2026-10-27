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
  return { title: p ? `${p.title} - Tiến độ báo cáo` : "Tiến độ báo cáo Chi đoàn" };
}

export default async function PeriodReportTrackerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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
      },
    }),
    db.chapterReport.findMany({
      where: { periodId: id },
      select: { id: true, departmentId: true, title: true, createdAt: true, viewCount: true },
    }),
    db.schoolYear.findMany({ orderBy: { startYear: "desc" } }),
  ]);

  if (!period) notFound();

  const schoolYears = schoolYearRows.map((s) => `${s.startYear}-${s.startYear + 1}`);

  const reportMap = new Map(reports.map((r) => [r.departmentId, r]));

  const trackerItems = departments.map((d) => ({
    department: d,
    report: reportMap.get(d.id) ?? null,
  }));

  const subtitle = [
    period.academicYear ? `Năm học ${period.academicYear}` : null,
    period.startDate ? `Từ ${formatDate(period.startDate)}` : null,
    period.endDate ? `Hạn chót: ${formatDate(period.endDate)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="text-xs text-muted">
          <Link href="/chapter-reports" className="inline-flex items-center gap-1 hover:text-primary">
            <ArrowLeft className="size-3.5" />
            Quay lại danh sách đợt báo cáo
          </Link>
        </nav>
      </div>

      <PageHeader
        title={period.title}
        description={subtitle || "Theo dõi tình hình nộp báo cáo của các Chi đoàn"}
        actions={
          <div className="flex items-center gap-2">
            <PeriodModalButton
              period={period}
              schoolYears={schoolYears}
              trigger={
                <button type="button" className={buttonClass("secondary")}>
                  Sửa đợt báo cáo
                </button>
              }
            />
            <Link href={`/chapter-reports/new?periodId=${period.id}`} className={buttonClass()}>
              <FileText className="size-4" />
              Đăng báo cáo thay
            </Link>
          </div>
        }
      />

      {period.description && (
        <div className="rounded-xl border border-primary/20 bg-primary-light/40 p-4 text-sm">
          <div className="font-semibold mb-1 flex items-center gap-1.5 text-primary">
            <Calendar className="size-4" /> Hướng dẫn & Yêu cầu nội dung báo cáo:
          </div>
          <p className="whitespace-pre-line text-foreground/90">{period.description}</p>
        </div>
      )}

      <PeriodDetailTracker period={period} items={trackerItems} />
    </div>
  );
}

