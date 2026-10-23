import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/misc";
import { MemberForm } from "@/components/members/member-form";

export const metadata = { title: "Thêm đoàn viên" };

export default async function NewMemberPage() {
  await requireRole(["ADMIN"]);
  const departments = await db.department.findMany({ where: { graduatedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } });
  return (
    <>
      <PageHeader title="Thêm đoàn viên" description="Hệ thống tự sinh mã đoàn viên và tài khoản đăng nhập." />
      <MemberForm departments={departments} />
    </>
  );
}
