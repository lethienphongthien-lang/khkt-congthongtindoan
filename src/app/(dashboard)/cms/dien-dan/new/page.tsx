import { requireRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/misc";
import { ArticleForm } from "@/components/cms/forms";

export const maxDuration = 60;

export default async function NewForumTopicPage() {
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
        title="Tạo chủ đề diễn đàn mới"
        description={
          user.role === "ADMIN"
            ? "Chủ đề sẽ hiển thị tại trang Diễn đàn công khai và cho phép học sinh gửi ý kiến thảo luận."
            : "Lưu bản nháp chủ đề để Ban Chấp Hành duyệt."
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

