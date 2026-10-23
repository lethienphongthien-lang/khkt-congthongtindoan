import Link from "next/link";
import { articleCategoriesWithCount, listArticles } from "@/lib/services/public";
import { pageParam, str } from "@/utils";
import { ArticleRow, EmptyPublic } from "@/components/public/blocks";
import { Pagination } from "@/components/ui/misc";
import { cn } from "@/utils";

export const metadata = { title: "Kế hoạch" };
const PAGE_SIZE = 10;

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const page = pageParam(sp.page);
  const { categories, uncategorized } = await articleCategoriesWithCount("PLAN");
  const requested = str(sp.dm);
  const dm = requested === "none" || categories.some((c) => c.id === requested) ? requested : undefined;
  const { items, total } = await listArticles("PLAN", page, PAGE_SIZE, dm);
  const all = categories.reduce((s, c) => s + c.count, 0) + uncategorized;
  // Tab đặt ngay dưới tiêu đề, "ngồi" trên đường kẻ xanh của tiêu đề trang
  const tab = (active: boolean) => cn("inline-flex items-center gap-1.5 rounded-t-md border border-b-0 px-3.5 py-1.5 text-sm font-semibold whitespace-nowrap transition-colors", active ? "border-primary bg-primary text-white" : "border-border bg-white/80 text-slate-700 hover:bg-primary-light");
  return (
    <>
      <div className={cn("mb-2", categories.length === 0 && "border-b-2 border-primary pb-1")}>
        <h1 className="text-2xl font-bold text-primary-dark">Kế hoạch</h1>
        {categories.length > 0 && (
          // Đường kẻ xanh là viền dưới của chính hàng tab nên liền mạch, không bị hở khi cuộn ngang
          <nav aria-label="Danh mục kế hoạch" className="no-scrollbar mt-2 flex gap-1 overflow-x-auto border-b-2 border-primary">
            <Link href="/ke-hoach" aria-current={!dm ? "page" : undefined} className={tab(!dm)}>Tất cả <span className="text-xs font-normal opacity-80">{all}</span></Link>
            {categories.map((c) => <Link key={c.id} href={`/ke-hoach?dm=${c.id}`} aria-current={dm === c.id ? "page" : undefined} className={tab(dm === c.id)}>{c.name} <span className="text-xs font-normal opacity-80">{c.count}</span></Link>)}
            {uncategorized > 0 && <Link href="/ke-hoach?dm=none" aria-current={dm === "none" ? "page" : undefined} className={tab(dm === "none")}>Chưa phân loại <span className="text-xs font-normal opacity-80">{uncategorized}</span></Link>}
          </nav>
        )}
      </div>
      <div className="rounded border border-border bg-white/85 px-1.5">
        {items.length === 0 ? <EmptyPublic text={dm ? "Chưa có kế hoạch nào trong danh mục này." : undefined} /> : items.map((a) => <ArticleRow key={a.id} a={a} />)}
      </div>
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath="/ke-hoach" params={{ dm }} />
    </>
  );
}
