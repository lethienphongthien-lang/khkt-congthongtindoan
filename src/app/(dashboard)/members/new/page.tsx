import { getT } from "@/lib/i18n/server";
import { redirect } from "next/navigation";
import { getEduPolicy } from "@/lib/services/edu-policy";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/misc";
import { MemberForm } from "@/components/members/member-form";

export async function generateMetadata() { const t = await getT(); return { title: t("members.addTitle") }; }

export default async function NewMemberPage() {
  await requireRole(["ADMIN"]);
  const t = await getT();
  const departments = await db.department.findMany({ where: { graduatedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } });
  const policy = await getEduPolicy();
  if (!(policy.profiles && policy.placement)) redirect("/members"); // dữ liệu do EduConnect quản lý: không có trang thêm
  return (
    <>
      <PageHeader title={t("members.addTitle")} description={t("members.addDesc")} />
      <MemberForm departments={departments} />
    </>
  );
}
