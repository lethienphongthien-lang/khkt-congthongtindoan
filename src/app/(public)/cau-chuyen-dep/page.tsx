import { listArticles } from "@/lib/services/public";
import { pageParam } from "@/utils";
import { ArticleGrid, EmptyPublic, PageTitle } from "@/components/public/blocks";
import { Pagination } from "@/components/ui/misc";

export const metadata = { title: "Câu chuyện đẹp" };
const PAGE_SIZE = 12;

export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = pageParam((await searchParams).page);
  const { items, total } = await listArticles("STORY", page, PAGE_SIZE);
  return (
    <>
      <PageTitle title="Câu chuyện đẹp" description="Mỗi tuần, các Chi đoàn chia sẻ một câu chuyện đẹp trong học tập và cuộc sống" />
      {items.length === 0 ? <div className="rounded border border-border bg-white/85"><EmptyPublic text="Chưa có câu chuyện nào." /></div> : <ArticleGrid items={items} />}
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath="/cau-chuyen-dep" params={{}} />
    </>
  );
}
