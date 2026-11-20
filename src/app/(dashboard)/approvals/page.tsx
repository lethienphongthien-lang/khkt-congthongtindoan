import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import {  } from "@/lib/services/public";
import { kindLabelT, kindActionT } from "@/lib/i18n/kind-labels";
import { kindSlug } from "@/lib/services/kind";
import { formatDate, formatDateTime } from "@/utils";
import { EmptyState, PageHeader, Section, Stat } from "@/components/ui/misc";
import { ApproveButton } from "@/components/cms/approve-button";
import { ConfessionActions } from "@/components/confession/review-actions";
import { VolunteerRequestActions } from "@/components/volunteer/request-actions";

export async function generateMetadata() { const t = await getT(); return { title: t("appr.title") }; }

export default async function ApprovalsPage() {
  await requireRole(["ADMIN"]);
  const t = await getT();
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
      <PageHeader title={t("appr.title")} description={t("appr.desc")} />
      <div className="grid grid-cols-2 gap-6 sm:max-w-3xl sm:grid-cols-5">
        <Stat label={t("appr.sArticles")} value={articles.length} />
        <Stat label={t("appr.sVolunteers")} value={volunteers.length} />
        <Stat label={t("appr.sFeedback")} value={feedback.length} />
        <Stat label={t("appr.sConfessions")} value={<Link href="/confessions" className="hover:text-primary">{confessions.length}</Link>} />
        <Stat label={t("appr.sReports")} value={reports.length} />
      </div>
      {total === 0 && reports.length === 0 && <div className="mt-6 rounded-lg border border-border bg-white/85"><EmptyState title={t("appr.nothing")} description={t("appr.nothingHint")} /></div>}

      <Section title={t("appr.hArticles", { n: articles.length })} className="mt-8">
        {articles.length === 0 ? <p className="text-sm text-muted">{t("appr.noArticles")}</p> : (
          <ul className={box}>
            {articles.map((a) => (
              <li key={a.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <Link href={`/cms/${kindSlug(a.kind)}/${a.id}`} className="line-clamp-2 font-medium hover:text-primary">{a.title}</Link>
                  <div className="text-xs text-muted">{kindLabelT(t, a.kind)} · {a.author?.fullName}{a.author?.secretaryOf ? ` (${t("dept.chapterName", { name: a.author.secretaryOf.name })})` : ""} · {formatDateTime(a.updatedAt)}</div>
                </div>
                <ApproveButton id={a.id} title={a.title} />
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={t("appr.hConfessions", { n: confessions.length })}>
        {confessions.length === 0 ? <p className="text-sm text-muted">{t("appr.noConfessions")}</p> : (
          <ul className={box}>
            {confessions.map((c) => (
              <li key={c.id} className="flex flex-wrap items-start gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-4 whitespace-pre-wrap break-words text-sm">{c.content}</p>
                  <div className="mt-1 text-xs text-muted">{c.nickname ? `${c.nickname} · ` : t("appr.anon") + " · "}{formatDateTime(c.createdAt)}</div>
                </div>
                <ConfessionActions id={c.id} status={c.status} />
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={t("appr.hVolunteers", { n: volunteers.length })}>
        {volunteers.length === 0 ? <p className="text-sm text-muted">{t("appr.noVolunteers")}</p> : (
          <ul className={box}>
            {volunteers.map((v) => (
              <li key={v.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{v.task} <span className="font-normal text-muted">· {t("dept.chapterName", { name: v.department.name })}</span></div>
                  <div className="text-xs text-muted">{formatDateTime(v.startAt)} · {v.location} · {t("appr.volDetail", { h: v.hours, p: v.points })}{v.note ? ` · ${v.note}` : ""}</div>
                </div>
                <VolunteerRequestActions id={v.id} task={v.task} admin />
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={t("appr.hFeedback", { n: feedback.length })}>
        {feedback.length === 0 ? <p className="text-sm text-muted">{t("appr.noFeedback")}</p> : (
          <ul className={box}>
            {feedback.map((f) => (
              <li key={f.id}>
                <Link href={`/feedback/${f.id}`} className="block px-4 py-3 hover:bg-slate-50">
                  <div className="line-clamp-2 text-sm font-medium">{f.content}</div>
                  <div className="text-xs text-muted">{f.category ?? t("appr.other")} · {formatDateTime(f.createdAt)}</div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={t("appr.hReports", { n: reports.length })}>
        {reports.length === 0 ? <p className="text-sm text-muted">{t("appr.noReports")}</p> : (
          <ul className={box}>
            {reports.map((r) => (
              <li key={r.id}>
                <Link href={`/chapter-reports/${r.id}`} className="block px-4 py-3 hover:bg-slate-50">
                  <div className="line-clamp-2 text-sm font-medium">{r.title}</div>
                  <div className="text-xs text-muted">{t("dept.chapterName", { name: r.department.name })} · {formatDate(r.createdAt)}</div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}
