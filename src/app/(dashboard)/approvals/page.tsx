import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { KIND_LABEL } from "@/lib/services/public";
import { kindSlug } from "@/lib/services/kind";
import { formatDate, formatDateTime } from "@/utils";
import { EmptyState, PageHeader, Section, Stat } from "@/components/ui/misc";
import { ApproveButton } from "@/components/cms/approve-button";
import { ConfessionActions } from "@/components/confession/review-actions";
import { VolunteerRequestActions } from "@/components/volunteer/request-actions";

export const metadata = { title: "Hàng chờ duyệt" };

export default async function ApprovalsPage() {
  await requireRole(["ADMIN"]);
  const weekAgo = new Date(Date.now() - 7 * 86400_000);
  const [articles, reports, feedback, volunteers, confessions] = await Promise.all([
    db.article.findMany({ where: { published: false, author: { role: "SECRETARY" } }, orderBy: { updatedAt: "desc" }, take: 30, include: { author: { select: { fullName: true, secretaryOf: { select: { name: true } } } } } }),
    db.chapterReport.findMany({ where: { createdAt: { gte: weekAgo } }, orderBy: { createdAt: "desc" }, take: 15, include: { department: { select: { name: true } } } }),
    db.feedback.findMany({ where: { status: "NEW" }, orderBy: { createdAt: "desc" }, take: 20 }),
    db.volunteerRequest.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "asc" }, take: 30, include: { department: { select: { name: true } } } }),
    db.confession.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "asc" }, take: 30 }),
  ]);
  const total = articles.length + feedback.length + volunteers.length + confessions.length;
  const box = "divide-y divide-border rounded-lg border border-border bg-white/85";
  return (
    <>
      <PageHeader title="Hàng chờ duyệt" description="Mọi việc đang chờ Admin xử lý, gom về một chỗ" />
      <div className="grid grid-cols-2 gap-6 sm:max-w-3xl sm:grid-cols-5">
        <Stat label="Bài chờ duyệt" value={articles.length} />
        <Stat label="Tình nguyện chờ duyệt" value={volunteers.length} />
        <Stat label="Góp ý mới" value={feedback.length} />
        <Stat label="Confession chờ duyệt" value={<Link href="/confessions" className="hover:text-primary">{confessions.length}</Link>} />
        <Stat label="Báo cáo 7 ngày" value={reports.length} />
      </div>
      {total === 0 && reports.length === 0 && <div className="mt-6 rounded-lg border border-border bg-white/85"><EmptyState title="Không có gì cần xử lý" description="Bài của bí thư, góp ý và báo cáo mới sẽ hiện ở đây." /></div>}

      <Section title={`Bài viết bí thư gửi chờ duyệt (${articles.length})`} className="mt-8">
        {articles.length === 0 ? <p className="text-sm text-muted">Không có bài nào chờ duyệt.</p> : (
          <ul className={box}>
            {articles.map((a) => (
              <li key={a.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <Link href={`/cms/${kindSlug(a.kind)}/${a.id}`} className="line-clamp-2 font-medium hover:text-primary">{a.title}</Link>
                  <div className="text-xs text-muted">{KIND_LABEL[a.kind]} · {a.author?.fullName}{a.author?.secretaryOf ? ` (Chi đoàn ${a.author.secretaryOf.name})` : ""} · {formatDateTime(a.updatedAt)}</div>
                </div>
                <ApproveButton id={a.id} title={a.title} />
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={`Confession chờ duyệt (${confessions.length})`}>
        {confessions.length === 0 ? <p className="text-sm text-muted">Không có confession nào chờ duyệt.</p> : (
          <ul className={box}>
            {confessions.map((c) => (
              <li key={c.id} className="flex flex-wrap items-start gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-4 whitespace-pre-wrap break-words text-sm">{c.content}</p>
                  <div className="mt-1 text-xs text-muted">{c.nickname ? `${c.nickname} · ` : "Ẩn danh · "}{formatDateTime(c.createdAt)}</div>
                </div>
                <ConfessionActions id={c.id} status={c.status} />
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={`Đăng ký tình nguyện chờ duyệt (${volunteers.length})`}>
        {volunteers.length === 0 ? <p className="text-sm text-muted">Không có đăng ký nào chờ duyệt.</p> : (
          <ul className={box}>
            {volunteers.map((v) => (
              <li key={v.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{v.task} <span className="font-normal text-muted">· Chi đoàn {v.department.name}</span></div>
                  <div className="text-xs text-muted">{formatDateTime(v.startAt)} · {v.location} · {v.hours} giờ, +{v.points} điểm mỗi em{v.note ? ` · ${v.note}` : ""}</div>
                </div>
                <VolunteerRequestActions id={v.id} task={v.task} admin />
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={`Góp ý chưa xem (${feedback.length})`}>
        {feedback.length === 0 ? <p className="text-sm text-muted">Không có góp ý mới.</p> : (
          <ul className={box}>
            {feedback.map((f) => (
              <li key={f.id}>
                <Link href={`/feedback/${f.id}`} className="block px-4 py-3 hover:bg-slate-50">
                  <div className="line-clamp-2 text-sm font-medium">{f.content}</div>
                  <div className="text-xs text-muted">{f.category ?? "Khác"} · {formatDateTime(f.createdAt)}</div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={`Báo cáo Chi đoàn mới trong 7 ngày (${reports.length})`}>
        {reports.length === 0 ? <p className="text-sm text-muted">Không có báo cáo mới.</p> : (
          <ul className={box}>
            {reports.map((r) => (
              <li key={r.id}>
                <Link href={`/chapter-reports/${r.id}`} className="block px-4 py-3 hover:bg-slate-50">
                  <div className="line-clamp-2 text-sm font-medium">{r.title}</div>
                  <div className="text-xs text-muted">Chi đoàn {r.department.name} · {formatDate(r.createdAt)}</div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}
