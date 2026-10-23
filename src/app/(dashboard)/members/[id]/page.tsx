import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { getMemberForUser } from "@/lib/services/queries";
import { PageHeader } from "@/components/ui/misc";
import { MemberProfile } from "@/components/members/member-profile";
import { MemberAdminActions } from "@/components/members/member-admin-actions";

export const metadata = { title: "Hồ sơ đoàn viên" };

export default async function MemberDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const user = await requireRole(["ADMIN", "SECRETARY"]);
  const { id } = await params;
  const tab = (await searchParams).tab === "hoat-dong" ? "hoat-dong" : "ho-so";
  // getMemberForUser đã áp phạm vi quyền: bí thư chỉ lấy được đoàn viên Chi đoàn của mình, ngược lại -> 404.
  const member = await getMemberForUser(user, id);
  if (!member) notFound();
  return (
    <>
      <PageHeader title="Hồ sơ đoàn viên"
        actions={user.role === "ADMIN" && <MemberAdminActions id={member.id} locked={member.user.status === "LOCKED"} isAdmin code={member.code} fullName={member.fullName} doanVien={member.isDoanVien} />} />
      <MemberProfile member={member} showAudit detail={user.role === "ADMIN"} tab={tab} basePath={`/members/${id}`} />
    </>
  );
}
