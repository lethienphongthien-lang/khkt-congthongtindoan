import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/misc";
import { VolunteerForm } from "@/components/volunteer/volunteer-form";
import { toLocalInput } from "@/utils";

export const metadata = { title: "Sửa đăng ký tình nguyện" };

export default async function EditVolunteerPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole(["ADMIN", "SECRETARY"]);
  const req = await db.volunteerRequest.findUnique({ where: { id: (await params).id }, include: { department: { select: { name: true } } } });
  if (!req || (user.role === "SECRETARY" && req.departmentId !== user.departmentId)) notFound();
  if (req.status !== "PENDING" && req.status !== "APPROVED") redirect("/volunteer");
  const s = toLocalInput(req.startAt), e = toLocalInput(req.endAt);
  return (
    <>
      <PageHeader title="Sửa đăng ký tình nguyện" description={`Chi đoàn ${req.department.name}${req.status === "APPROVED" ? ". Buổi đã duyệt, đoàn viên sẽ nhận thông báo khi bạn lưu thay đổi" : ""}`} />
      <VolunteerForm initial={{ id: req.id, task: req.task, date: s.slice(0, 10), startTime: s.slice(11, 16), endTime: e.slice(11, 16), location: req.location, hours: req.hours, points: req.points, note: req.note ?? "" }} />
    </>
  );
}
