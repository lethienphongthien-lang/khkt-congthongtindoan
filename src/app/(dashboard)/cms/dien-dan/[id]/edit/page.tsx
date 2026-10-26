import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { toLocalInput } from "@/utils";
import { PageHeader } from "@/components/ui/misc";
import { ArticleForm } from "@/components/cms/forms";

export const maxDuration = 60;

export default async function EditForumTopicPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole(["ADMIN", "SECRETARY"]);
  const isAdmin = user.role === "ADMIN";
  const { id } = await params;

  const a = await db.article.findUnique({
    where: { id },
    include: { attachments: { orderBy: { createdAt: "asc" } } },
  });

  if (!a || (!isAdmin && (a.authorId !== user.id || a.published))) notFound();

  // Đảm bảo danh mục "Diễn đàn"
  const forumCat = await db.articleCategory.upsert({
    where: { kind_name: { kind: "PLAN", name: "Diễn đàn" } },
    update: {},
    create: { kind: "PLAN", name: "Diễn đàn", sortOrder: 0 },
  });

  return (
    <>
      <PageHeader title="Sửa chủ đề diễn đàn" description={a.title} />
      <ArticleForm
        id={a.id}
        draftOnly={!isAdmin}
        kind={a.kind}
        categories={[{ id: forumCat.id, name: "Diễn đàn" }]}
        files={a.attachments.map((f) => ({
          name: f.name,
          url: f.url,
          publicId: f.publicId,
          size: f.size,
          mime: f.mime ?? undefined,
        }))}
        image={a.coverUrl && a.coverPublicId ? { imageUrl: a.coverUrl, publicId: a.coverPublicId } : null}
        initial={{
          title: a.title,
          summary: a.summary ?? "",
          content: a.content,
          eventAt: a.eventAt ? toLocalInput(a.eventAt) : "",
          eventLocation: a.eventLocation ?? "",
          published: a.published,
          publishedAt: a.publishedAt ? toLocalInput(a.publishedAt) : "",
          departmentId: a.departmentId ?? "",
          categoryId: a.categoryId ?? forumCat.id,
        }}
      />
    </>
  );
}

