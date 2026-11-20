import { getT } from "@/lib/i18n/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/misc";
import { ReportForm } from "@/components/cms/forms";
import { redirect } from "next/navigation";

export async function generateMetadata() { return { title: (await getT())("cms.crp.newTitle") }; }

export default async function NewReportPage({ searchParams }: { searchParams: Promise<{ periodId?: string }> }) {
  const t = await getT();
  const user = await requireRole(["ADMIN", "SECRETARY", "DEPARTMENT_ACCOUNT"]);
  const { periodId } = await searchParams;

  // Nếu là Bí thư và đã nộp báo cáo cho đợt này rồi, chuyển hướng thẳng đến báo cáo đã nộp
  if (user.role !== "ADMIN" && user.departmentId && periodId) {
    const existing = await db.chapterReport.findFirst({
      where: { departmentId: user.departmentId, periodId },
      select: { id: true },
    });
    if (existing) {
      redirect(`/chapter-reports/${existing.id}`);
    }
  }

  const [departments, periods] = await Promise.all([
    user.role === "ADMIN"
      ? db.department.findMany({ where: { graduatedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } })
      : [],
    db.reportPeriod.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, status: true, endDate: true },
    }),
  ]);

  return (
    <>
      <PageHeader title={t("cms.crp.newTitle")} description={user.role !== "ADMIN" ? t("cms.crp.newChapter", { name: user.departmentName ?? "" }) : t("cms.crp.newAdmin")} />
      <ReportForm
        departments={departments}
        periods={periods}
        defaultPeriodId={periodId}
        fixedDepartment={user.role !== "ADMIN" ? user.departmentName ?? undefined : undefined}
      />
    </>
  );
}
