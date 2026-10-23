import { db } from "@/lib/db";
import { articleCard } from "@/lib/services/public";
import { str } from "@/utils";
import { ArticleRow, EmptyPublic, PageTitle } from "@/components/public/blocks";

export const metadata = { title: "Tìm kiếm" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = (str((await searchParams).q) ?? "").trim().slice(0, 100);
  const items = q.length >= 2
    ? await db.article.findMany({
        where: { published: true, publishedAt: { lte: new Date() }, OR: [{ title: { contains: q, mode: "insensitive" } }, { summary: { contains: q, mode: "insensitive" } }, { content: { contains: q, mode: "insensitive" } }] },
        orderBy: { publishedAt: "desc" }, take: 30, select: articleCard,
      })
    : [];
  return (
    <>
      <PageTitle title="Kết quả tìm kiếm" description={q ? `Từ khóa: “${q}” · ${items.length} kết quả` : "Nhập ít nhất 2 ký tự"} />
      <div className="rounded border border-border bg-white/85 px-4">
        {items.length === 0 ? <EmptyPublic text={q.length >= 2 ? "Không tìm thấy bài viết phù hợp." : "Nhập từ khóa vào ô tìm kiếm."} /> : items.map((a) => <ArticleRow key={a.id} a={a} showKind />)}
      </div>
    </>
  );
}
