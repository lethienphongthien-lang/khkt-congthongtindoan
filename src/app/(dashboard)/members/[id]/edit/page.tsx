import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { toDateInput } from "@/utils";
import { PageHeader } from "@/components/ui/misc";
import { MemberForm } from "@/components/members/member-form";
import { ALL_DETAIL_FIELDS } from "@/lib/member-detail-fields";

export const metadata = { title: "Sửa đoàn viên" };

export default async function EditMemberPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["ADMIN"]);
  const { id } = await params;
  const [m, departments] = await Promise.all([
    db.member.findUnique({ where: { id }, include: { detail: true } }),
    db.department.findMany({ where: { graduatedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!m) notFound();
  const rec = (m.detail ?? {}) as Record<string, unknown>;
  const detail: Record<string, string | boolean> = {};
  for (const f of ALL_DETAIL_FIELDS) { const v = rec[f.key]; detail[f.key] = f.type === "bool" ? !!v : v instanceof Date ? toDateInput(v) : (v as string | null | undefined) ?? ""; }
  return (
    <>
      <PageHeader title={`Sửa: ${m.fullName}`} description={`${m.isDoanVien ? "Mã đoàn viên" : "Mã thành viên"} ${m.code}`} />
      <MemberForm id={id} departments={departments} detail={detail} initial={{
        fullName: m.fullName, gender: m.gender ?? "", dateOfBirth: toDateInput(m.dateOfBirth), joinedAt: toDateInput(m.joinedAt),
        cohort: m.cohort ?? "", isDoanVien: m.isDoanVien, departmentId: m.departmentId, status: m.status,
        avatar: m.avatarUrl && m.avatarPublicId ? { imageUrl: m.avatarUrl, publicId: m.avatarPublicId } : null,
      }} />
    </>
  );
}
