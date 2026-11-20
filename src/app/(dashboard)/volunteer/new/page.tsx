import { getT } from "@/lib/i18n/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/misc";
import { VolunteerForm } from "@/components/volunteer/volunteer-form";

export async function generateMetadata() { return { title: (await getT())("cms.vol.register") }; }

export default async function NewVolunteerPage() {
  const t = await getT();
  const user = await requireRole(["ADMIN", "SECRETARY", "DEPARTMENT_ACCOUNT"]);
  const departments = user.role === "ADMIN" ? await db.department.findMany({ where: { graduatedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } }) : undefined;
  return (
    <>
      <PageHeader title={t("cms.vol.register")} description={user.role !== "ADMIN" ? t("cms.vol.forChapter", { name: user.departmentName ?? "" }) : t("cms.vol.onBehalf")} />
      <VolunteerForm departments={departments} />
    </>
  );
}
