import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { ADMIN_ONLY_KINDS } from "@/lib/services/kind";
import { CMS_SLUG, KIND_LABEL } from "@/lib/services/public";
import { toLocalInput } from "@/utils";
import { PageHeader } from "@/components/ui/misc";
import { ArticleForm } from "@/components/cms/forms";

export const maxDuration = 60; // trợ lý AI có thể cần vài chục giây

export default async function EditArticlePage({ params }: { params: Promise<{ kind: string; id: string }> }) {
  const user = await requireRole(["ADMIN", "SECRETARY"]);
  const isAdmin = user.role === "ADMIN";
  const { kind: slug, id } = await params;
  const kind = CMS_SLUG[slug];
  const a = kind ? await db.article.findFirst({ where: { id, kind }, include: { attachments: { orderBy: { createdAt: "asc" } } } }) : null; // chỉ sửa trong đúng loại của route
  if (!a || (!isAdmin && (a.authorId !== user.id || a.published))) notFound(); // bí thư chỉ sửa bản nháp của mình
  const categories = a.kind === "PLAN" ? await db.articleCategory.findMany({ where: { kind: "PLAN" }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true, name: true } }) : undefined;
  const departments = a.kind === "STORY" && isAdmin ? await db.department.findMany({ where: { graduatedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } }) : undefined;
  if (!isAdmin && ADMIN_ONLY_KINDS.includes(a.kind)) notFound();
  return (
    <>
      <PageHeader title={`Sửa ${KIND_LABEL[a.kind].toLowerCase()}`} />
      <ArticleForm id={a.id} draftOnly={!isAdmin} kind={a.kind} departments={departments} categories={categories} files={a.attachments.map((f) => ({ name: f.name, url: f.url, publicId: f.publicId, size: f.size, mime: f.mime ?? undefined }))} image={a.coverUrl && a.coverPublicId ? { imageUrl: a.coverUrl, publicId: a.coverPublicId } : null}
        initial={{ title: a.title, summary: a.summary ?? "", content: a.content, eventAt: a.eventAt ? toLocalInput(a.eventAt) : "", eventLocation: a.eventLocation ?? "", published: a.published, publishedAt: a.publishedAt ? toLocalInput(a.publishedAt) : "", departmentId: a.departmentId ?? "", categoryId: a.categoryId ?? "" }} />
    </>
  );
}
