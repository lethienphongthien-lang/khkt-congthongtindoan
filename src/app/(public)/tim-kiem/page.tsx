import { db } from "@/lib/db";
import { articleCard } from "@/lib/services/public";
import { str } from "@/utils";
import { ArticleRow, EmptyPublic, PageTitle } from "@/components/public/blocks";
import { getT } from "@/lib/i18n/server";


export async function generateMetadata() {
  return { title: (await getT())("common.search") };
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const t = await getT();
  const q = (str((await searchParams).q) ?? "").trim().slice(0, 100);
  const items = q.length >= 2
    ? await db.article.findMany({
        where: { published: true, publishedAt: { lte: new Date() }, OR: [{ title: { contains: q, mode: "insensitive" } }, { summary: { contains: q, mode: "insensitive" } }, { content: { contains: q, mode: "insensitive" } }] },
        orderBy: { publishedAt: "desc" }, take: 30, select: articleCard,
      })
    : [];
  return (
    <>
      <PageTitle title={t("public.search.title")} description={q ? t("public.search.keyword", { q, n: items.length }) : t("public.search.min")} />
      <div className="rounded border border-border bg-white/85 px-4">
        {items.length === 0 ? <EmptyPublic text={q.length >= 2 ? t("public.search.notFound") : t("public.search.enter")} /> : items.map((a) => <ArticleRow key={a.id} a={a} showKind />)}
      </div>
    </>
  );
}
