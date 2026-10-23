import Link from "next/link";
import { departmentsByGrade } from "@/lib/services/public";
import { cn, str } from "@/utils";
import { PageTitle } from "@/components/public/blocks";

export const metadata = { title: "Báo cáo Chi đoàn" };

export default async function ReportsIndexPage({ searchParams }: { searchParams: Promise<{ khoi?: string }> }) {
  const khoi = str((await searchParams).khoi);
  const groups = await departmentsByGrade();
  const shown = khoi ? groups.filter(([g]) => g === khoi) : groups;
  return (
    <>
      <PageTitle title="Báo cáo Chi đoàn" description="Chọn khối (hoặc Chi đoàn giáo viên) và Chi đoàn để xem báo cáo" />
      <div className="mb-5 flex flex-wrap gap-2">
        {[["", "Tất cả"], ...groups.map(([g]) => [g, g === "gv" ? "Chi đoàn giáo viên" : `Khối ${g}`])].map(([v, l]) => (
          <Link key={v} href={v ? `/bao-cao-chi-doan?khoi=${v}` : "/bao-cao-chi-doan"} className={cn("rounded-full border px-4 py-1.5 text-sm", (khoi ?? "") === v ? "border-primary bg-primary text-white" : "border-border bg-white/85 hover:bg-primary-light")}>{l}</Link>
        ))}
      </div>
      {shown.length === 0 ? <p className="py-10 text-center text-sm text-muted">Chưa có Chi đoàn nào.</p> : (
        <div className="space-y-6">
          {shown.map(([g, depts]) => (
            <section key={g}>
              <h2 className="mb-3 border-l-4 border-primary pl-3 text-lg font-bold text-primary-dark">{g === "gv" ? "Chi đoàn giáo viên" : `Khối ${g}`}</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {depts.map((d) => (
                  <Link key={d.id} href={`/bao-cao-chi-doan/${d.id}`} className="rounded border border-border bg-white/85 p-4 text-center hover:border-primary hover:bg-primary-light">
                    <div className="text-lg font-bold text-primary-dark">{d.name}</div>
                    <div className="text-xs text-muted">{d._count.chapterReports} báo cáo</div>
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
