import Link from "next/link";
import { ClickRow } from "@/components/ui/click-row";
import { Plus, Calendar, Clock, CheckCircle2, AlertCircle, Eye, ChevronRight, FileText, Send, ArrowRight } from "lucide-react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { formatDate, pageParam } from "@/utils";
import { buttonClass } from "@/components/ui/button";
import { CompactList } from "@/components/ui/compact-list";
import { DataTable, EmptyState, PageHeader, Pagination, Td, Th } from "@/components/ui/misc";
import { ReportRowActions } from "@/components/cms/row-actions";
import { PeriodModalButton, PeriodRowActions } from "@/components/cms/period-modal";

export const metadata = { title: "Báo cáo Chi đoàn" };
const PAGE_SIZE = 10;

export default async function ChapterReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await requireRole(["ADMIN", "SECRETARY"]);
  const page = pageParam((await searchParams).page);

  // Lấy danh sách các đợt báo cáo và năm học
  const [periods, totalDepts, schoolYearRows] = await Promise.all([
    db.reportPeriod.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { reports: true } },
      },
    }),
    db.department.count({ where: { graduatedAt: null } }),
    db.schoolYear.findMany({ orderBy: { startYear: "desc" } }),
  ]);

  const schoolYears = schoolYearRows.map((s) => `${s.startYear}-${s.startYear + 1}`);

  if (user.role === "SECRETARY") {
    const deptId = user.departmentId ?? "__none__";

    // Lấy danh sách báo cáo mà Chi đoàn này đã nộp cho các đợt
    const deptReports = await db.chapterReport.findMany({
      where: { departmentId: deptId },
      select: {
        id: true,
        periodId: true,
        title: true,
        createdAt: true,
        viewCount: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const reportByPeriod = new Map<string, typeof deptReports[0]>();
    for (const r of deptReports) {
      if (r.periodId) reportByPeriod.set(r.periodId, r);
    }

    // Các báo cáo tự do hoặc không theo đợt
    const otherReports = deptReports.filter((r) => !r.periodId);

    return (
      <div className="space-y-8">
        <PageHeader
          title="Báo cáo Chi đoàn"
          description={`Chi đoàn ${user.departmentName} · Theo dõi các đợt báo cáo và nộp báo cáo hoạt động`}
          actions={
            <Link href="/chapter-reports/new" className={buttonClass()}>
              <Plus className="size-4" />
              Nộp báo cáo
            </Link>
          }
        />

        {/* Khối Đợt báo cáo cho Bí thư */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Calendar className="size-5 text-primary" />
                Các đợt báo cáo từ BCH Đoàn trường
              </h2>
              <p className="text-xs text-muted">
                Kiểm tra các đợt yêu cầu báo cáo và nộp đúng thời hạn quy định.
              </p>
            </div>
          </div>

          {periods.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-white/60 p-8 text-center text-sm text-muted">
              Hiện tại chưa có đợt báo cáo nào được tạo bởi BCH Đoàn trường.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {periods.map((period) => {
                const report = reportByPeriod.get(period.id);
                const isClosed = period.status === "CLOSED";
                const deadlinePassed = period.endDate && new Date(period.endDate) < new Date();

                return (
                  <div
                    key={period.id}
                    className={`flex flex-col justify-between rounded-xl border p-5 shadow-sm transition-all ${
                      report
                        ? "border-emerald-200 bg-emerald-50/20"
                        : isClosed
                        ? "border-slate-200 bg-slate-50/50 opacity-80"
                        : "border-primary/30 bg-white hover:border-primary hover:shadow-md"
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            report
                              ? "bg-emerald-100 text-emerald-800"
                              : isClosed
                              ? "bg-slate-100 text-slate-700"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {report ? (
                            <>
                              <CheckCircle2 className="size-3.5" /> Đã báo cáo
                            </>
                          ) : isClosed ? (
                            <>
                              <Clock className="size-3.5" /> Đã đóng đợt
                            </>
                          ) : (
                            <>
                              <AlertCircle className="size-3.5" /> Chưa báo cáo
                            </>
                          )}
                        </span>

                        {period.academicYear && (
                          <span className="text-[11px] text-muted">
                            Năm học {period.academicYear}
                          </span>
                        )}
                      </div>

                      <h3 className="mt-2 text-base font-bold text-foreground">
                        {period.title}
                      </h3>

                      {period.description && (
                        <p className="mt-1 line-clamp-2 text-xs text-muted">
                          {period.description}
                        </p>
                      )}

                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                        {period.endDate && (
                          <span className="flex items-center gap-1">
                            <Clock className="size-3.5 text-amber-500" />
                            Hạn chót:{" "}
                            <strong className={deadlinePassed ? "text-rose-600" : "text-foreground"}>
                              {formatDate(period.endDate)}
                            </strong>
                          </span>
                        )}
                      </div>

                      {report && (
                        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/60 p-2.5 text-xs text-foreground">
                          <div className="font-medium text-emerald-700 line-clamp-1">
                            Bài đã nộp: {report.title}
                          </div>
                          <div className="text-[11px] text-muted">
                            Thời gian nộp: {formatDate(report.createdAt)}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-border flex items-center justify-end gap-2">
                      {report ? (
                        <Link
                          href={`/chapter-reports/${report.id}`}
                          className={buttonClass("secondary", "sm")}
                        >
                          <Eye className="size-3.5" />
                          Xem báo cáo
                        </Link>
                      ) : isClosed ? (
                        <span className="text-xs text-muted italic">Đã hết hạn nộp</span>
                      ) : (
                        <Link
                          href={`/chapter-reports/new?periodId=${period.id}`}
                          className={buttonClass("primary", "sm")}
                        >
                          <Send className="size-3.5" />
                          Nộp báo cáo
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Danh sách báo cáo khác */}
        {otherReports.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-base font-bold text-foreground">
              Báo cáo thường xuyên / định kỳ khác ({otherReports.length})
            </h2>
            <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
              <DataTable>
                <thead>
                  <tr>
                    <Th>Tiêu đề</Th>
                    <Th>Ngày nộp</Th>
                    <Th>Lượt xem</Th>
                    <Th className="text-right">Thao tác</Th>
                  </tr>
                </thead>
                <tbody>
                  {otherReports.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80">
                      <Td className="font-medium">
                        <Link href={`/chapter-reports/${r.id}`} className="hover:text-primary">
                          {r.title}
                        </Link>
                      </Td>
                      <Td className="text-xs text-muted">{formatDate(r.createdAt)}</Td>
                      <Td className="text-xs text-muted">{r.viewCount.toLocaleString("vi-VN")}</Td>
                      <Td className="text-right">
                        <ReportRowActions id={r.id} />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </div>
          </section>
        )}
      </div>
    );
  }

  // Giao diện dành cho BAN CHẤP HÀNH (ADMIN)
  const where = {};
  const [recentReports, totalReports] = await Promise.all([
    db.chapterReport.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        department: { select: { name: true } },
        period: { select: { id: true, title: true } },
      },
    }),
    db.chapterReport.count({ where }),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Quản lý Báo cáo Chi đoàn"
        description="Theo dõi tiến độ nộp báo cáo theo từng đợt và quản lý báo cáo của toàn trường"
        actions={
          <div className="flex items-center gap-2">
            <PeriodModalButton schoolYears={schoolYears} />
            <Link href="/chapter-reports/new" className={buttonClass("secondary")}>
              <Plus className="size-4" />
              Đăng báo cáo tự do
            </Link>
          </div>
        }
      />

      {/* Mục 1: Danh sách các đợt báo cáo */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Calendar className="size-5 text-primary" />
              Danh sách các đợt báo cáo ({periods.length})
            </h2>
            <p className="text-xs text-muted">
              Bấm vào từng đợt để xem danh sách báo cáo và trạng thái của tất cả Chi đoàn.
            </p>
          </div>
        </div>

        {periods.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-white/70 p-8 text-center">
            <Calendar className="mx-auto size-8 text-muted mb-2" />
            <div className="text-base font-semibold text-foreground">Chưa có đợt báo cáo nào</div>
            <p className="text-xs text-muted mt-1 max-w-md mx-auto">
              Hãy tạo đợt báo cáo đầu tiên (ví dụ: Báo cáo tháng 10, Sơ kết HK1) để các Chi đoàn nộp báo cáo.
            </p>
            <div className="mt-4">
              <PeriodModalButton schoolYears={schoolYears} />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {periods.map((p) => {
              const submittedCount = p._count.reports;
              const percent = totalDepts > 0 ? Math.round((submittedCount / totalDepts) * 100) : 0;
              const isClosed = p.status === "CLOSED";

              return (
                <div
                  key={p.id}
                  className="flex flex-col justify-between rounded-xl border border-border bg-white p-5 shadow-sm hover:border-primary/60 hover:shadow-md transition-all group"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          isClosed
                            ? "bg-slate-100 text-slate-700"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {isClosed ? "Đã đóng đợt" : "Đang mở nhận báo cáo"}
                      </span>

                      <PeriodRowActions period={p} schoolYears={schoolYears} />
                    </div>

                    <Link href={`/chapter-reports/period/${p.id}`} className="block mt-2">
                      <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                        {p.title}
                      </h3>
                    </Link>

                    {p.academicYear && (
                      <div className="text-xs text-muted mt-0.5">Năm học {p.academicYear}</div>
                    )}

                    {p.description && (
                      <p className="mt-2 line-clamp-2 text-xs text-muted">{p.description}</p>
                    )}

                    {/* Tiến độ nộp */}
                    <div className="mt-4 rounded-lg bg-slate-50 p-3 border border-border">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-muted">Tiến độ nộp:</span>
                        <span className="font-bold text-primary">
                          {submittedCount} / {totalDepts} Chi đoàn ({percent}%)
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                        <div
                          className={`h-full transition-all duration-300 ${
                            percent === 100 ? "bg-emerald-500" : "bg-primary"
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs text-muted">
                      {p.endDate ? (
                        <span>
                          Hạn chót: <strong>{formatDate(p.endDate)}</strong>
                        </span>
                      ) : (
                        <span>Không giới hạn hạn chót</span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                    <Link
                      href={`/chapter-reports/period/${p.id}`}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                    >
                      Xem danh sách Chi đoàn
                      <ArrowRight className="size-3.5" />
                    </Link>

                    <Link
                      href={`/chapter-reports/new?periodId=${p.id}`}
                      className={buttonClass("ghost", "sm")}
                      title="Đăng báo cáo thay"
                    >
                      <Plus className="size-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Mục 2: Báo cáo gửi gần đây của toàn trường */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <FileText className="size-5 text-primary" />
              Tất cả báo cáo đã nộp ({totalReports})
            </h2>
            <p className="text-xs text-muted">Danh sách các bài báo cáo gần đây của các Chi đoàn</p>
          </div>
        </div>

        {recentReports.length === 0 ? (
          <div className="rounded-xl border border-border bg-white/85 p-8 text-center text-sm text-muted">
            Chưa có báo cáo nào được nộp.
          </div>
        ) : (
          <>
            <CompactList
              items={recentReports.map((r) => ({
                id: r.id,
                title: r.title,
                subtitle: `Chi đoàn ${r.department.name} · ${r.period ? `[${r.period.title}] · ` : ""}${formatDate(r.createdAt)}`,
                href: `/chapter-reports/${r.id}`,
              }))}
            />
            <div className="max-sm:hidden rounded-xl border border-border bg-white shadow-sm overflow-hidden">
              <DataTable>
                <thead>
                  <tr>
                    <Th>Tiêu đề</Th>
                    <Th>Chi đoàn</Th>
                    <Th>Đợt báo cáo</Th>
                    <Th>Ngày nộp</Th>
                    <Th className="text-right">Thao tác</Th>
                  </tr>
                </thead>
                <tbody>
                  {recentReports.map((r) => (
                    <ClickRow key={r.id} href={`/chapter-reports/${r.id}`}>
                      <Td className="font-medium">
                        <Link href={`/chapter-reports/${r.id}`} className="hover:text-primary">
                          {r.title}
                        </Link>
                      </Td>
                      <Td className="font-semibold text-primary-dark">{r.department.name}</Td>
                      <Td className="text-xs text-muted">
                        {r.period ? (
                          <span className="rounded bg-primary-light px-2 py-0.5 text-primary font-medium">
                            {r.period.title}
                          </span>
                        ) : (
                          <span className="italic text-slate-400">Tự do</span>
                        )}
                      </Td>
                      <Td className="whitespace-nowrap text-xs text-muted">
                        {formatDate(r.createdAt)}
                      </Td>
                      <Td className="text-right">
                        <ReportRowActions id={r.id} />
                      </Td>
                    </ClickRow>
                  ))}
                </tbody>
              </DataTable>
            </div>
          </>
        )}
        <Pagination page={page} pageSize={PAGE_SIZE} total={totalReports} basePath="/chapter-reports" params={{}} />
      </section>
    </div>
  );
}
