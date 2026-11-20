import { listArticles } from "@/lib/services/public";
import { pageParam } from "@/utils";
import { ArticleGrid, EmptyPublic, PageTitle } from "@/components/public/blocks";
import { Pagination } from "@/components/ui/misc";
import { getT } from "@/lib/i18n/server";

const PAGE_SIZE = 12;

export async function generateMetadata() {
  return { title: (await getT())("public.doc.title") };
}

export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const t = await getT();
  const page = pageParam((await searchParams).page);
  const { items, total } = await listArticles("DOCUMENT", page, PAGE_SIZE);
  return (
    <>
      <PageTitle title={t("public.doc.title")} description={t("public.doc.desc")} />
      {items.length === 0 ? <div className="rounded border border-border bg-white/85"><EmptyPublic text={t("public.doc.empty")} /></div> : <ArticleGrid items={items} />}
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath="/tai-lieu-sinh-hoat" params={{}} />
    </>
  );
}
