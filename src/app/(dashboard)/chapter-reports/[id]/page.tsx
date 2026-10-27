import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { canManageDepartment } from "@/lib/permissions";
import { formatDate } from "@/utils";
import { buttonClass } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/misc";
import { ReportRowActions } from "@/components/cms/row-actions";
import { RichText } from "@/components/public/rich-text";

export const metadata = { title: "Báo cáo Chi đoàn" };

export default async function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole(["ADMIN", "SECRETARY"]);
  const r = await db.chapterReport.findUnique({
    where: { id: (await params).id },
    include: {
      department: { select: { name: true } },
      period: { select: { id: true, title: true } },
    },
  });
  if (!r || !canManageDepartment(user, r.departmentId)) notFound();
  const desc = [
    `Chi đoàn ${r.department.name}`,
    r.period ? `Đợt: ${r.period.title}` : null,
    r.participantCount != null ? `${r.participantCount} đoàn viên tham gia` : null,
    formatDate(r.createdAt),
    `${r.viewCount.toLocaleString("vi-VN")} lượt xem`,
  ].filter(Boolean).join(" · ");

  return (
    <>
      <PageHeader title={r.title} stackActions description={desc}
        actions={<>
          <Link href={`/bao-cao-chi-doan/bao-cao/${r.id}`} target="_blank" className={buttonClass("secondary")}><ExternalLink className="size-4" /><span className="max-sm:hidden">Xem công khai</span></Link>
          <ReportRowActions id={r.id} backToList />
        </>} />
      {r.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={r.imageUrl} alt="" className="mb-4 max-h-96 w-full rounded-lg object-cover" />
      )}
      <RichText text={r.content} />
    </>
  );
}
