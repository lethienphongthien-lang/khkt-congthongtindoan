import { listArticles } from "@/lib/services/public";
import { pageParam } from "@/utils";
import { ArticleGrid, EmptyPublic, PageTitle } from "@/components/public/blocks";
import { Pagination } from "@/components/ui/misc";

export const metadata = { title: "Tài liệu sinh hoạt Chi đoàn" };
const PAGE_SIZE = 12;

export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = pageParam((await searchParams).page);
  const { items, total } = await listArticles("DOCUMENT", page, PAGE_SIZE);
  return (
    <>
      <PageTitle title="Tài liệu sinh hoạt Chi đoàn" description="Tài liệu, giáo án và mẫu biểu giúp bí thư tổ chức sinh hoạt Chi đoàn (tải về ở cuối mỗi bài)" />
      {items.length === 0 ? <div className="rounded border border-border bg-white/85"><EmptyPublic text="Chưa có tài liệu sinh hoạt nào." /></div> : <ArticleGrid items={items} />}
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath="/tai-lieu-sinh-hoat" params={{}} />
    </>
  );
}
