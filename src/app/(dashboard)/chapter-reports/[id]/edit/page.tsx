import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { canManageDepartment } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/misc";
import { ReportForm } from "@/components/cms/forms";

export const metadata = { title: "Sửa báo cáo" };

export default async function EditReportPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole(["ADMIN", "SECRETARY"]);
  const r = await db.chapterReport.findUnique({ where: { id: (await params).id }, include: { department: { select: { name: true } } } });
  if (!r || !canManageDepartment(user, r.departmentId)) notFound(); // bí thư không sửa được báo cáo của Chi đoàn khác
  const departments = user.role === "ADMIN" ? await db.department.findMany({ where: { graduatedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } }) : [];
  return (
    <>
      <PageHeader title="Sửa báo cáo" />
      <ReportForm id={r.id} departments={departments} fixedDepartment={user.role === "SECRETARY" ? r.department.name : undefined}
        image={r.imageUrl && r.imagePublicId ? { imageUrl: r.imageUrl, publicId: r.imagePublicId } : null}
        initial={{ departmentId: r.departmentId, title: r.title, content: r.content }} />
    </>
  );
}
