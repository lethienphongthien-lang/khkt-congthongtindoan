import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { SITE_PAGES } from "@/lib/services/public";
import { PageHeader } from "@/components/ui/misc";
import { SitePageForm } from "@/components/cms/forms";
import type { AttachmentValue } from "@/components/ui/file-upload";

export const metadata = { title: "Sửa trang giới thiệu" };

export default async function EditSitePage({ params }: { params: Promise<{ slug: string }> }) {
  await requireRole(["ADMIN"]);
  const { slug } = await params;
  if (!SITE_PAGES[slug]) notFound();
  const page = await db.sitePage.findUnique({ where: { slug } });
  return (<><PageHeader title={SITE_PAGES[slug]} /><SitePageForm slug={slug} title={SITE_PAGES[slug]} initial={page?.content ?? ""} initialTabs={Array.isArray(page?.tabs) ? (page.tabs as { title: string; content: string; attachments?: AttachmentValue[] }[]).map((t) => ({ ...t, attachments: t.attachments ?? [] })) : []} initialFiles={Array.isArray(page?.attachments) ? (page.attachments as AttachmentValue[]) : []} /></>);
}
