import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/misc";
import { ReportForm } from "@/components/cms/forms";

export const metadata = { title: "Đăng báo cáo" };

export default async function NewReportPage() {
  const user = await requireRole(["ADMIN", "SECRETARY"]);
  const departments = user.role === "ADMIN" ? await db.department.findMany({ where: { graduatedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } }) : [];
  return (<><PageHeader title="Đăng báo cáo" /><ReportForm departments={departments} fixedDepartment={user.role === "SECRETARY" ? user.departmentName ?? undefined : undefined} /></>);
}
