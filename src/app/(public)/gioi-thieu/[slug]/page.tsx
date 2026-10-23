import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SITE_PAGES, getSitePage } from "@/lib/services/public";
import { PageTitle } from "@/components/public/blocks";
import { RichText } from "@/components/public/rich-text";
import { SiteTabs } from "@/components/public/site-tabs";
import { Eye } from "lucide-react";
import { db } from "@/lib/db";
import { ViewTracker } from "@/components/public/view-tracker";
import { Attachments, type PublicAttachment } from "@/components/public/attachments";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return SITE_PAGES[slug] ? { title: SITE_PAGES[slug] } : {};
}

export default async function IntroPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { slug } = await params;
  if (!SITE_PAGES[slug]) notFound();
  const [page, sp, live] = await Promise.all([getSitePage(slug), searchParams, db.sitePage.findUnique({ where: { slug }, select: { viewCount: true } })]);
  type Raw = { name: string; url: string; publicId: string; size?: number };
  const files = (v: unknown): PublicAttachment[] => (Array.isArray(v) ? (v as Raw[]) : []).filter((f) => f?.url && f?.name).map((f) => ({ id: f.publicId, name: f.name, url: f.url, size: f.size ?? 0 }));
  const tabs = (Array.isArray(page?.tabs) ? (page.tabs as { title: string; content: string; attachments?: unknown }[]) : []).filter((t) => t?.title);
  const empty = <p className="py-6 text-center text-sm text-muted">Nội dung đang được cập nhật.</p>;
  return (
    <div>
      <ViewTracker kind="page" id={slug} />
      <PageTitle title={SITE_PAGES[slug]} description={undefined} />
      <div className="-mt-1 mb-3 flex items-center gap-1 text-sm text-muted"><Eye className="size-4" />{(live?.viewCount ?? 0).toLocaleString("vi-VN")} lượt xem</div>
      {tabs.length > 0 ? (
        <SiteTabs titles={tabs.map((t) => t.title)} initial={Number(sp.tab) || 0}>
          {tabs.map((t) => (<div key={t.title}>{t.content.trim() ? <RichText text={t.content} /> : files(t.attachments).length ? null : empty}<Attachments files={files(t.attachments)} /></div>))}
        </SiteTabs>
      ) : (
        <div className="rounded border border-border bg-white/85 p-5">{page?.content.trim() ? <RichText text={page.content} /> : files(page?.attachments).length ? null : empty}<Attachments files={files(page?.attachments)} /></div>
      )}
    </div>
  );
}
