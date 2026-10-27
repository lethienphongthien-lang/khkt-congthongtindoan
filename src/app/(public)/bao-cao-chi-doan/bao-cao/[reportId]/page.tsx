import Link from "next/link";
import { cdnImage } from "@/lib/image-url";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatDate } from "@/utils";
import { Eye } from "lucide-react";
import { ViewTracker } from "@/components/public/view-tracker";
import { RichText } from "@/components/public/rich-text";

export default async function ReportDetailPage({ params }: { params: Promise<{ reportId: string }> }) {
  const r = await db.chapterReport.findUnique({
    where: { id: (await params).reportId },
    include: {
      department: { select: { id: true, name: true } },
      createdBy: { select: { fullName: true } },
      period: { select: { id: true, title: true } },
    },
  });
  if (!r) notFound();
  return (
    <article className="w-full">
      <ViewTracker kind="report" id={r.id} />
      <nav className="mb-3 text-[13px] text-muted"><Link href="/bao-cao-chi-doan" className="hover:text-primary">Báo cáo Chi đoàn</Link> › <Link href={`/bao-cao-chi-doan/${r.department.id}`} className="hover:text-primary">Chi đoàn {r.department.name}</Link></nav>
      <h1 className="text-2xl font-bold text-primary-dark">{r.title}</h1>
      <div className="mt-2 border-b border-border pb-3 text-sm text-muted">Chi đoàn {r.department.name}{r.period ? ` · [${r.period.title}]` : ""} · {formatDate(r.createdAt)}{r.createdBy ? ` · ${r.createdBy.fullName}` : ""} · <span className="inline-flex items-center gap-1 align-middle"><Eye className="size-4" />{r.viewCount.toLocaleString("vi-VN")} lượt xem</span></div>
      {r.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cdnImage(r.imageUrl, 1000)} alt="" loading="lazy" decoding="async" className="mx-auto my-5 max-h-72 w-auto max-w-full rounded border border-border object-contain sm:max-h-96" />
      )}
      <div className="mt-5 rounded bg-white/85 p-5"><RichText text={r.content} /></div>
    </article>
  );
}
