import { getT } from "@/lib/i18n/server";
import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/misc";
import { ArticleForm } from "@/components/cms/forms";

export const maxDuration = 60;

export default async function NewForumTopicPage() {
  const t = await getT();
  const user = await requireRole(["ADMIN", "SECRETARY"]);

  // Đảm bảo danh mục "Diễn đàn" luôn tồn tại
  const forumCat = await db.articleCategory.upsert({
    where: { kind_name: { kind: "PLAN", name: "Diễn đàn" } },
    update: {},
    create: { kind: "PLAN", name: "Diễn đàn", sortOrder: 0 },
  });

  return (
    <>
      <PageHeader
        title={t("cms.fo.newTitle")}
        description={
          user.role === "ADMIN"
            ? t("cms.fo.newDescAdmin")
            : t("cms.fo.newDescSec")
        }
      />
      <ArticleForm
        kind="PLAN"
        draftOnly={user.role !== "ADMIN"}
        categories={[{ id: forumCat.id, name: "Diễn đàn" }]}
        initial={{
          title: "",
          summary: "",
          content: "",
          eventAt: "",
          eventLocation: "",
          published: user.role === "ADMIN",
          categoryId: forumCat.id,
        }}
      />
    </>
  );
}

