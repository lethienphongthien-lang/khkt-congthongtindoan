import { listArticles } from "@/lib/services/public";
import { pageParam } from "@/utils";
import { ArticleGrid, EmptyPublic, PageTitle } from "@/components/public/blocks";
import { Pagination } from "@/components/ui/misc";

export const metadata = { title: "Hướng nghiệp" };
const PAGE_SIZE = 12;

export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = pageParam((await searchParams).page);
  const { items, total } = await listArticles("CAREER", page, PAGE_SIZE);
  return (
    <>
      <PageTitle title="Hướng nghiệp" description="Thông tin ngành nghề, tuyển sinh và kinh nghiệm chọn nghề cho học sinh" />
      {items.length === 0 ? <div className="rounded border border-border bg-white/85"><EmptyPublic text="Chưa có bài hướng nghiệp nào." /></div> : <ArticleGrid items={items} />}
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath="/dinh-huong-nghe-nghiep" params={{}} />
    </>
  );
}
