import { listArticles } from "@/lib/services/public";
import { pageParam } from "@/utils";
import { ArticleRow, EmptyPublic, PageTitle } from "@/components/public/blocks";
import { Pagination } from "@/components/ui/misc";
import { getT } from "@/lib/i18n/server";

const PAGE_SIZE = 10;

export async function generateMetadata() {
  return { title: (await getT())("public.announce.title") };
}

export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const t = await getT();
  const page = pageParam((await searchParams).page);
  const { items, total } = await listArticles("ANNOUNCEMENT", page, PAGE_SIZE);
  return (
    <>
      <PageTitle title={t("public.announce.title")} description={t("public.announce.desc")} />
      <div className="rounded border border-border bg-white/85 px-1.5">
        {items.length === 0 ? <EmptyPublic /> : items.map((a) => <ArticleRow key={a.id} a={a} />)}
      </div>
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath="/thong-bao" params={{}} />
    </>
  );
}
