import { listArticles } from "@/lib/services/public";
import { pageParam } from "@/utils";
import { ArticleGrid, EmptyPublic, PageTitle } from "@/components/public/blocks";
import { Pagination } from "@/components/ui/misc";
import { getT } from "@/lib/i18n/server";

const PAGE_SIZE = 12;

export async function generateMetadata() {
  return { title: (await getT())("public.career.title") };
}

export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const t = await getT();
  const page = pageParam((await searchParams).page);
  const { items, total } = await listArticles("CAREER", page, PAGE_SIZE);
  return (
    <>
      <PageTitle title={t("public.career.title")} description={t("public.career.desc")} />
      {items.length === 0 ? <div className="rounded border border-border bg-white/85"><EmptyPublic text={t("public.career.empty")} /></div> : <ArticleGrid items={items} />}
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath="/dinh-huong-nghe-nghiep" params={{}} />
    </>
  );
}
