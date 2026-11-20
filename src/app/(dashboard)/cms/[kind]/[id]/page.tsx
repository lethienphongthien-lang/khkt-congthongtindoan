import { getT, getLocale } from "@/lib/i18n/server";
import { intlLocale } from "@/lib/i18n/format";
import { cdnImage } from "@/lib/image-url";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Eye } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { CMS_SLUG, articleHref } from "@/lib/services/public";
import { kindLabelT, kindActionT } from "@/lib/i18n/kind-labels";
import { formatDate, formatDateTime } from "@/utils";
import { buttonClass } from "@/components/ui/button";
import { PageHeader, StatusBadge } from "@/components/ui/misc";
import { ArticleRowActions, ArticleStatus } from "@/components/cms/row-actions";
import { RichText } from "@/components/public/rich-text";
import { Attachments } from "@/components/public/attachments";
import { AiReviewPanel } from "@/components/cms/ai-assist";

export default async function CmsArticleDetail({ params }: { params: Promise<{ kind: string; id: string }> }) {
  const t = await getT();
  const locale = await getLocale();
  const user = await requireRole(["ADMIN", "SECRETARY"]);
  const isAdmin = user.role === "ADMIN";
  const { kind: slug, id } = await params;
  const kind = CMS_SLUG[slug];
  const a = kind ? await db.article.findFirst({ where: { id, kind }, include: { attachments: { orderBy: { createdAt: "asc" } }, author: { select: { fullName: true, role: true } } } }) : null;
  if (!a || (!isAdmin && a.authorId !== user.id)) notFound();
  const base = `/cms/${slug}`;
  return (
    <>
      <PageHeader title={a.title} stackActions
        actions={<>
          {isAdmin && a.published && <Link href={articleHref(a.slug)} target="_blank" className={buttonClass("secondary")}><ExternalLink className="size-4" /><span className="max-sm:hidden">{t("cms.k.viewPublicShort")}</span></Link>}
          {(isAdmin || !a.published) && <ArticleRowActions id={a.id} published={a.published} base={base} backToList ownerOnly={!isAdmin} />}
        </>} />
      <div className="mb-4 space-y-1 text-sm text-muted">
        {/* Một hàng: trạng thái · ngày tạo · người đăng (rút gọn nhãn, tên dài thì cắt "…") */}
        <div className="flex items-center gap-x-3 whitespace-nowrap">
          <ArticleStatus published={a.published} pending={!a.published && a.author?.role === "SECRETARY"} />
          <span className="shrink-0">{formatDate(a.publishedAt ?? a.createdAt)}{a.publishedAt && a.publishedAt > new Date() ? t("cms.k.scheduledDot") : ""}</span>
          {a.author?.fullName && <span className="min-w-0 truncate" title={t("cms.k.postedBy", { name: a.author.fullName })}>· {a.author.fullName}</span>}
          <span className="inline-flex shrink-0 items-center gap-1">· <Eye className="size-4" />{t("cms.k.viewsLong", { n: a.viewCount.toLocaleString(intlLocale(locale)) })}</span>
        </div>
        {(a.eventAt || a.eventLocation) && (
          <div className="flex flex-wrap gap-x-4">
            {a.eventAt && <span>{t("cms.k.time", { t: formatDateTime(a.eventAt) })}</span>}
            {a.eventLocation && <span>{t("cms.k.place", { l: a.eventLocation })}</span>}
          </div>
        )}
      </div>
      {isAdmin && !a.published && <AiReviewPanel articleId={a.id} />}
      {a.summary && <p className="mb-4 font-medium">{a.summary}</p>}
      <RichText text={a.content} />
      {a.coverUrl && (
        <div className="mt-6">
          <div className="mb-1.5 text-sm font-medium">{t("cms.k.cover")}</div>
          {/* Hiện nhỏ gọn nhưng đủ cả ảnh, không cắt */}
          <a href={a.coverUrl} target="_blank" rel="noreferrer" title={t("cms.k.coverTip")} className="inline-block overflow-hidden rounded-lg border border-border bg-slate-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cdnImage(a.coverUrl, 600)} alt={t("cms.k.cover")} loading="lazy" decoding="async" className="block h-auto max-h-48 w-auto max-w-full object-contain" />
          </a>
        </div>
      )}
      <div className="mt-4"><Attachments files={a.attachments.map((f) => ({ id: f.id, name: f.name, url: f.url, size: f.size }))} /></div>
    </>
  );
}
