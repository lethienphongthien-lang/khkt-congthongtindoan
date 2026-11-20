import { getT } from "@/lib/i18n/server";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/misc";
import { VolunteerForm } from "@/components/volunteer/volunteer-form";
import { toLocalInput } from "@/utils";

export async function generateMetadata() { return { title: (await getT())("cms.vol.edit") }; }

export default async function EditVolunteerPage({ params }: { params: Promise<{ id: string }> }) {
  const t = await getT();
  const user = await requireRole(["ADMIN", "SECRETARY", "DEPARTMENT_ACCOUNT"]);
  const req = await db.volunteerRequest.findUnique({ where: { id: (await params).id }, include: { department: { select: { name: true } } } });
  if (!req || (user.role !== "ADMIN" && req.departmentId !== user.departmentId)) notFound();
  if (req.status !== "PENDING" && req.status !== "APPROVED") redirect("/volunteer");
  const s = toLocalInput(req.startAt), e = toLocalInput(req.endAt);
  return (
    <>
      <PageHeader title={t("cms.vol.edit")} description={`${t("cms.vol.editDesc", { name: req.department.name })}${req.status === "APPROVED" ? t("cms.vol.editApproved") : ""}`} />
      <VolunteerForm initial={{ id: req.id, task: req.task, date: s.slice(0, 10), startTime: s.slice(11, 16), endTime: e.slice(11, 16), location: req.location, hours: req.hours, points: req.points, note: req.note ?? "" }} />
    </>
  );
}
