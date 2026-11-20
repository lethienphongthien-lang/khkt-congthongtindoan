import { getT } from "@/lib/i18n/server";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { canManageDepartment } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/misc";
import { ReportForm } from "@/components/cms/forms";

export async function generateMetadata() { return { title: (await getT())("cms.crp.editTitle") }; }

export default async function EditReportPage({ params }: { params: Promise<{ id: string }> }) {
  const t = await getT();
  const user = await requireRole(["ADMIN", "SECRETARY", "DEPARTMENT_ACCOUNT"]);
  const r = await db.chapterReport.findUnique({ where: { id: (await params).id }, include: { department: { select: { name: true } } } });
  if (!r || !canManageDepartment(user, r.departmentId)) notFound(); // bí thư không sửa được báo cáo của Chi đoàn khác

  const [departments, periods] = await Promise.all([
    user.role === "ADMIN" ? db.department.findMany({ where: { graduatedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } }) : [],
    db.reportPeriod.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, status: true, endDate: true },
    }),
  ]);

  return (
    <>
      <PageHeader title={t("cms.crp.editTitle")} />
      <ReportForm
        id={r.id}
        departments={departments}
        periods={periods}
        fixedDepartment={user.role !== "ADMIN" ? r.department.name : undefined}
        image={r.imageUrl && r.imagePublicId ? { imageUrl: r.imageUrl, publicId: r.imagePublicId } : null}
        initial={{ departmentId: r.departmentId, title: r.title, content: r.content, periodId: r.periodId, participantCount: r.participantCount }}
      />
    </>
  );
}
