import type { Metadata } from "next";
import { ImageLightbox } from "@/components/public/image-lightbox";
import { FadeImage } from "@/components/public/fade-image";
import { cdnImage } from "@/lib/image-url";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Eye, MapPin, Pencil } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { kindSlug } from "@/lib/services/kind";
import { KIND_LABEL, KIND_PATH, getArticle, relatedArticles } from "@/lib/services/public";
import { formatDate, formatDateTime } from "@/utils";
import { siteUrl } from "@/lib/site-url";
import { RichText } from "@/components/public/rich-text";
import { ViewTracker } from "@/components/public/view-tracker";
import { Attachments } from "@/components/public/attachments";
import { Block, SideArticleList } from "@/components/public/blocks";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const a = await getArticle((await params).slug);
  if (!a) return {};
  const description = a.summary ?? undefined;
  return {
    title: a.title, description, alternates: { canonical: `/bai-viet/${a.slug}` },
    openGraph: { type: "article", title: a.title, description, publishedTime: a.publishedAt?.toISOString(), modifiedTime: a.updatedAt.toISOString(), ...(a.coverUrl ? { images: [{ url: a.coverUrl }] } : {}) },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const a = await getArticle((await params).slug);
  if (!a) notFound();
  // Số lượt xem đọc trực tiếp (không qua bộ nhớ đệm) để người xem thấy số mới ngay
  const views = (await db.article.findUnique({ where: { id: a.id }, select: { viewCount: true } }))?.viewCount ?? a.viewCount;
  const canEdit = (await getCurrentUser())?.role === "ADMIN"; // Admin và Ban chấp hành
  const related = (await relatedArticles(a)).filter((g) => g.items.length);
  // Dữ liệu có cấu trúc (JSON-LD) giúp Google hiểu đây là bài viết/sự kiện và hiển thị đẹp hơn trong kết quả tìm kiếm
  const base = siteUrl();
  const jsonLd = a.kind === "EVENT" && a.eventAt
    ? { "@context": "https://schema.org", "@type": "Event", name: a.title, description: a.summary ?? undefined, startDate: a.eventAt.toISOString(), eventStatus: "https://schema.org/EventScheduled", location: a.eventLocation ? { "@type": "Place", name: a.eventLocation } : undefined, image: a.coverUrl ? [a.coverUrl] : undefined, organizer: { "@type": "Organization", name: "Đoàn trường THPT Sơn Hà" }, url: `${base}/bai-viet/${a.slug}` }
    : { "@context": "https://schema.org", "@type": "Article", headline: a.title, description: a.summary ?? undefined, datePublished: a.publishedAt?.toISOString(), dateModified: a.updatedAt.toISOString(), image: a.coverUrl ? [a.coverUrl] : undefined, author: { "@type": "Organization", name: "Đoàn trường THPT Sơn Hà" }, publisher: { "@type": "Organization", name: "Đoàn trường THPT Sơn Hà" }, mainEntityOfPage: `${base}/bai-viet/${a.slug}` };
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    <article className="min-w-0 lg:col-span-2">
      <ViewTracker id={a.id} />
      <nav className="mb-3 text-[13px] text-muted"><Link href="/" className="hover:text-primary">Trang chủ</Link> › <Link href={KIND_PATH[a.kind]} className="hover:text-primary">{KIND_LABEL[a.kind]}</Link></nav>
      <div className="flex items-start gap-2">
        <h1 className="min-w-0 flex-1 text-2xl font-bold text-primary-dark sm:text-3xl">{a.title}</h1>
        {canEdit && (
          <Link href={`/cms/${kindSlug(a.kind)}/${a.id}/edit`} title="Sửa bài viết" aria-label="Sửa bài viết"
            className="mt-1 shrink-0 rounded-full border border-border bg-white p-2 text-primary shadow-sm hover:bg-primary-light"><Pencil className="size-4" /></Link>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border pb-3 text-sm text-muted">
        {a.publishedAt && <span>{formatDate(a.publishedAt)}</span>}
        <span className="inline-flex items-center gap-1"><Eye className="size-4" />{views.toLocaleString("vi-VN")} lượt xem</span>
        {a.category && <Link href={`${KIND_PATH[a.kind]}?dm=${a.category.id}`} className="rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-800 hover:underline">{a.category.name}</Link>}
        {a.department && <span className="rounded bg-primary-light px-1.5 py-0.5 font-medium text-primary-dark">Chi đoàn {a.department.name}</span>}
        {a.author && <span>Đăng bởi {a.author.fullName}</span>}
        {a.eventAt && <span className="inline-flex items-center gap-1"><CalendarDays className="size-4" />{formatDateTime(a.eventAt)}</span>}
        {a.eventLocation && <span className="inline-flex items-center gap-1"><MapPin className="size-4" />{a.eventLocation}</span>}
      </div>
      {a.coverUrl && (
        <ImageLightbox><FadeImage src={cdnImage(a.coverUrl, 1600)} eager wrapperClassName="my-5 min-h-40 w-full rounded border border-border" className="h-auto max-h-[80vh] object-contain" /></ImageLightbox>
      )}
      {a.summary && <p className="my-5 text-lg font-medium text-slate-700">{a.summary}</p>}
      <div className="overflow-x-auto rounded bg-white/85 p-5"><RichText text={a.content} /></div>
      <Attachments files={a.attachments.map((f) => ({ id: f.id, name: f.name, url: f.url, size: f.size }))} />
    </article>
    <aside className="space-y-6">
      {related.map((g) => (
        <Block key={g.kind} title={g.kind === a.kind ? `${KIND_LABEL[g.kind]} khác` : KIND_LABEL[g.kind]} href={KIND_PATH[g.kind]}>
          <SideArticleList items={g.items} />
        </Block>
      ))}
    </aside>
    </div>
  );
}
