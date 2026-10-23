import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/misc";
import { VolunteerForm } from "@/components/volunteer/volunteer-form";

export const metadata = { title: "Đăng ký tình nguyện" };

export default async function NewVolunteerPage() {
  const user = await requireRole(["ADMIN", "SECRETARY"]);
  const departments = user.role === "ADMIN" ? await db.department.findMany({ where: { graduatedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } }) : undefined;
  return (
    <>
      <PageHeader title="Đăng ký tình nguyện" description={user.role === "SECRETARY" ? `Cho Chi đoàn ${user.departmentName}` : "Đăng ký thay cho một Chi đoàn"} />
      <VolunteerForm departments={departments} />
    </>
  );
}
