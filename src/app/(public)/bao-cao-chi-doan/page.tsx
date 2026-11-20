import Link from "next/link";
import { departmentsByGrade } from "@/lib/services/public";
import { cn, str } from "@/utils";
import { PageTitle } from "@/components/public/blocks";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata() {
  return { title: (await getT())("menu.bao-cao") };
}

export default async function ReportsIndexPage({ searchParams }: { searchParams: Promise<{ khoi?: string }> }) {
  const t = await getT();
  const khoi = str((await searchParams).khoi);
  const groups = await departmentsByGrade();
  const shown = khoi ? groups.filter(([g]) => g === khoi) : groups;
  return (
    <>
      <PageTitle title={t("menu.bao-cao")} description={t("community.rep.pick")} />
      <div className="mb-5 flex flex-wrap gap-2">
        {[["", t("community.all")], ...groups.map(([g]) => [g, g === "gv" ? t("reports.teachers") : t("reports.grade", { grade: g })])].map(([v, l]) => (
          <Link key={v} href={v ? `/bao-cao-chi-doan?khoi=${v}` : "/bao-cao-chi-doan"} className={cn("rounded-full border px-4 py-1.5 text-sm", (khoi ?? "") === v ? "border-primary bg-primary text-white" : "border-border bg-white/85 hover:bg-primary-light")}>{l}</Link>
        ))}
      </div>
      {shown.length === 0 ? <p className="py-10 text-center text-sm text-muted">{t("community.rep.none")}</p> : (
        <div className="space-y-6">
          {shown.map(([g, depts]) => (
            <section key={g}>
              <h2 className="mb-3 border-l-4 border-primary pl-3 text-lg font-bold text-primary-dark">{g === "gv" ? t("reports.teachers") : t("reports.grade", { grade: g })}</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {depts.map((d) => (
                  <Link key={d.id} href={`/bao-cao-chi-doan/${d.id}`} className="rounded border border-border bg-white/85 p-4 text-center hover:border-primary hover:bg-primary-light">
                    <div className="text-lg font-bold text-primary-dark">{d.name}</div>
                    <div className="text-xs text-muted">{t("community.rep.count", { n: d._count.chapterReports })}</div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
