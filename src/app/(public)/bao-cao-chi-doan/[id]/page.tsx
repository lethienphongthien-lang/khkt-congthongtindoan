import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatDate, pageParam } from "@/utils";
import { EmptyPublic, PageTitle } from "@/components/public/blocks";
import { Pagination } from "@/components/ui/misc";
import { plainText } from "@/lib/rich-html";
import { getT, getLocale } from "@/lib/i18n/server";
import { intlLocale } from "@/lib/i18n/format";

const PAGE_SIZE = 10;

export default async function DepartmentReportsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ page?: string }> }) {
  const t = await getT();
  const locale = await getLocale();
  const { id } = await params;
  const page = pageParam((await searchParams).page);
  const dept = await db.department.findUnique({ where: { id }, select: { id: true, name: true } });
  if (!dept) notFound();
  const [reports, total] = await Promise.all([
    db.chapterReport.findMany({
      where: { departmentId: id },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        title: true,
        content: true,
        createdAt: true,
        viewCount: true,
        period: { select: { title: true } },
      },
    }),
    db.chapterReport.count({ where: { departmentId: id } }),
  ]);
  return (
    <>
      <nav className="mb-3 text-[13px] text-muted"><Link href="/bao-cao-chi-doan" className="hover:text-primary">{t("menu.bao-cao")}</Link> › {t("community.emu.chapterName", { name: dept.name })}</nav>
      <PageTitle title={t("community.rep.deptTitle", { name: dept.name })} />
      <div className="rounded border border-border bg-white/85 px-4">
        {reports.length === 0 ? <EmptyPublic text={t("community.rep.deptEmpty")} /> : reports.map((r) => (
          <article key={r.id} className="border-b border-border py-3 last:border-0">
            <div className="flex items-start justify-between gap-2">
              <Link href={`/bao-cao-chi-doan/bao-cao/${r.id}`} className="font-semibold hover:text-primary">{r.title}</Link>
              {r.period && (
                <span className="shrink-0 rounded bg-primary-light px-2 py-0.5 text-xs text-primary font-medium">
                  {r.period.title}
                </span>
              )}
            </div>
            <div className="text-xs text-muted">{formatDate(r.createdAt)} · {t("community.views", { n: r.viewCount.toLocaleString(intlLocale(locale)) })}</div>
            <p className="mt-1 line-clamp-2 text-sm text-slate-600">{plainText(r.content, 200)}</p>
          </article>
        ))}
      </div>
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath={`/bao-cao-chi-doan/${id}`} params={{}} />
    </>
  );
}
