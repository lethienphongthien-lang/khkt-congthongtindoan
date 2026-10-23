import { listArticles } from "@/lib/services/public";
import { pageParam } from "@/utils";
import { ArticleRow, EmptyPublic, PageTitle } from "@/components/public/blocks";
import { Pagination } from "@/components/ui/misc";

export const metadata = { title: "Tin tức" };
const PAGE_SIZE = 10;

export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = pageParam((await searchParams).page);
  const { items, total } = await listArticles("NEWS", page, PAGE_SIZE);
  return (
    <>
      <PageTitle title="Tin tức" description="Tin tức và hoạt động của Đoàn trường" />
      <div className="rounded border border-border bg-white/85 px-1.5">
        {items.length === 0 ? <EmptyPublic /> : items.map((a) => <ArticleRow key={a.id} a={a} />)}
      </div>
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath="/tin-tuc" params={{}} />
    </>
  );
}
