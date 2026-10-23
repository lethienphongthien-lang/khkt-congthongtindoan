import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { formatDateTime } from "@/utils";
import { PageHeader } from "@/components/ui/misc";
import { FeedbackActions } from "@/components/feedback/feedback-actions";

export const metadata = { title: "Chi tiết góp ý" };

export default async function FeedbackDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["ADMIN"]);
  const { id } = await params;
  let f = await db.feedback.findUnique({ where: { id } });
  if (!f) notFound();
  if (f.status === "NEW") f = await db.feedback.update({ where: { id }, data: { status: "READ" } }); // mở xem = đã xem
  return (
    <>
      <PageHeader title={f.category ?? "Góp ý"} description={`Gửi lúc ${formatDateTime(f.createdAt)}`} />
      <div className="mb-6 max-w-3xl whitespace-pre-wrap rounded-lg border border-border bg-white/85 p-4 text-[15px] leading-relaxed">{f.content}</div>
      {f.contact && <p className="mb-6 text-sm"><span className="text-muted">Cách liên hệ: </span>{f.contact}</p>}
      <FeedbackActions id={f.id} status={f.status} note={f.note ?? ""} />
    </>
  );
}
