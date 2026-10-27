import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/misc";
import { ReportForm } from "@/components/cms/forms";
import { redirect } from "next/navigation";

export const metadata = { title: "Nộp báo cáo Chi đoàn" };

export default async function NewReportPage({ searchParams }: { searchParams: Promise<{ periodId?: string }> }) {
  const user = await requireRole(["ADMIN", "SECRETARY"]);
  const { periodId } = await searchParams;

  // Nếu là Bí thư và đã nộp báo cáo cho đợt này rồi, chuyển hướng thẳng đến báo cáo đã nộp
  if (user.role === "SECRETARY" && user.departmentId && periodId) {
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
      <PageHeader title="Nộp báo cáo Chi đoàn" description={user.role === "SECRETARY" ? `Chi đoàn ${user.departmentName}` : "Đăng báo cáo cho Chi đoàn"} />
      <ReportForm
        departments={departments}
        periods={periods}
        defaultPeriodId={periodId}
        fixedDepartment={user.role === "SECRETARY" ? user.departmentName ?? undefined : undefined}
      />
    </>
  );
}
