import { getT, getLocale } from "@/lib/i18n/server";
import { intlLocale } from "@/lib/i18n/format";
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

export async function generateMetadata() { return { title: (await getT())("cms.crp.title") }; }
const PAGE_SIZE = 10;

export default async function ChapterReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const t = await getT();
  const locale = await getLocale();
  const user = await requireRole(["ADMIN", "SECRETARY", "DEPARTMENT_ACCOUNT"]);
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

  if (user.role !== "ADMIN") {
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
        participantCount: true,
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
          title={t("cms.crp.title")}
          description={t("cms.crp.secDesc", { name: user.departmentName ?? "" })}
          actions={
            <Link href="/chapter-reports/new" className={buttonClass()}>
              <Plus className="size-4" />
              {t("cms.crp.submit")}
            </Link>
          }
        />

        {/* Khối Đợt báo cáo cho Bí thư */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Calendar className="size-5 text-primary" />
                {t("cms.crp.fromBch")}
              </h2>
              <p className="text-xs text-muted">
                {t("cms.crp.fromBchHint")}
              </p>
            </div>
          </div>

          {periods.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-white/60 p-8 text-center text-sm text-muted">
              {t("cms.crp.noPeriods")}
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
                              <CheckCircle2 className="size-3.5" /> {t("cms.crp.reported")}
                            </>
                          ) : isClosed ? (
                            <>
                              <Clock className="size-3.5" /> {t("cms.crp.periodClosed")}
                            </>
                          ) : (
                            <>
                              <AlertCircle className="size-3.5" /> {t("cms.crp.notReported")}
                            </>
                          )}
                        </span>

                        {period.academicYear && (
                          <span className="text-[11px] text-muted">
                            {t("cms.crp.year", { y: period.academicYear })}
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
                            {t("cms.crp.deadline")}{" "}
                            <strong className={deadlinePassed ? "text-rose-600" : "text-foreground"}>
                              {formatDate(period.endDate)}
                            </strong>
                          </span>
                        )}
                      </div>

                      {report && (
                        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/60 p-2.5 text-xs text-foreground">
                          <div className="font-medium text-emerald-700 line-clamp-1">
                            {t("cms.crp.submitted", { title: report.title })}
                          </div>
                          <div className="text-[11px] text-muted">
                            {t("cms.crp.submittedAt", { d: formatDate(report.createdAt) })}
                            {report.participantCount != null && <>{t("cms.crp.nParticipants", { n: report.participantCount })}</>}
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
                          {t("cms.crp.viewReport")}
                        </Link>
                      ) : isClosed ? (
                        <span className="text-xs text-muted italic">{t("cms.crp.expired")}</span>
                      ) : (
                        <Link
                          href={`/chapter-reports/new?periodId=${period.id}`}
                          className={buttonClass("primary", "sm")}
                        >
                          <Send className="size-3.5" />
                          {t("cms.crp.submit")}
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
              {t("cms.crp.others", { n: otherReports.length })}
            </h2>
            <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
              <DataTable>
                <thead>
                  <tr>
                    <Th>{t("cms.crp.thTitle")}</Th>
                    <Th>{t("cms.crp.thDate")}</Th>
                    <Th>{t("cms.crp.thViews")}</Th>
                    <Th className="text-right">{t("cms.crp.thActions")}</Th>
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
                      <Td className="text-xs text-muted">{r.viewCount.toLocaleString(intlLocale(locale))}</Td>
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
        department: { select: { name: true, _count: { select: { members: { where: { status: "ACTIVE" } } } } } },
        period: { select: { id: true, title: true } },
      },
    }),
    db.chapterReport.count({ where }),
  ]);

  // Chuỗi "32/45 (71%)" hoặc "—" với báo cáo cũ chưa ghi nhận số đoàn viên tham gia
  const participation = (r: (typeof recentReports)[number]) => {
    if (r.participantCount == null) return null;
    const total = r.department._count.members;
    return total > 0 ? t("cms.crp.pctOfSize", { a: r.participantCount, b: total, p: Math.round((r.participantCount / total) * 100) }) : `${r.participantCount}`;
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("cms.crp.adminTitle")}
        description={t("cms.crp.adminDesc")}
        actions={
          <div className="flex items-center gap-2">
            <PeriodModalButton schoolYears={schoolYears} />
            <Link href="/chapter-reports/new" className={buttonClass("secondary")}>
              <Plus className="size-4" />
              {t("cms.crp.freePost")}
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
              {t("cms.crp.periodList", { n: periods.length })}
            </h2>
            <p className="text-xs text-muted">
              {t("cms.crp.periodListHint")}
            </p>
          </div>
        </div>

        {periods.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-white/70 p-8 text-center">
            <Calendar className="mx-auto size-8 text-muted mb-2" />
            <div className="text-base font-semibold text-foreground">{t("cms.crp.noPeriodTitle")}</div>
            <p className="text-xs text-muted mt-1 max-w-md mx-auto">
              {t("cms.crp.noPeriodDesc")}
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
                        {isClosed ? t("cms.crp.periodClosed") : t("cms.crp.openForReports")}
                      </span>

                      <PeriodRowActions period={p} schoolYears={schoolYears} />
                    </div>

                    <Link href={`/chapter-reports/period/${p.id}`} className="block mt-2">
                      <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                        {p.title}
                      </h3>
                    </Link>

                    {p.academicYear && (
                      <div className="text-xs text-muted mt-0.5">{t("cms.crp.year", { y: p.academicYear })}</div>
                    )}

                    {p.description && (
                      <p className="mt-2 line-clamp-2 text-xs text-muted">{p.description}</p>
                    )}

                    {/* Tiến độ nộp */}
                    <div className="mt-4 rounded-lg bg-slate-50 p-3 border border-border">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-muted">{t("cms.crp.progress")}</span>
                        <span className="font-bold text-primary">
                          {t("cms.crp.progressVal", { a: submittedCount, b: totalDepts, p: percent })}
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
                          {t("cms.crp.deadline")} <strong>{formatDate(p.endDate)}</strong>
                        </span>
                      ) : (
                        <span>{t("cms.crp.noDeadline")}</span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                    <Link
                      href={`/chapter-reports/period/${p.id}`}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                    >
                      {t("cms.crp.viewChapters")}
                      <ArrowRight className="size-3.5" />
                    </Link>

                    <Link
                      href={`/chapter-reports/new?periodId=${p.id}`}
                      className={buttonClass("ghost", "sm")}
                      title={t("cms.crp.postFor")}
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
              {t("cms.crp.allReports", { n: totalReports })}
            </h2>
            <p className="text-xs text-muted">{t("cms.crp.allReportsHint")}</p>
          </div>
        </div>

        {recentReports.length === 0 ? (
          <div className="rounded-xl border border-border bg-white/85 p-8 text-center text-sm text-muted">
            {t("cms.crp.noReports")}
          </div>
        ) : (
          <>
            <CompactList
              items={recentReports.map((r) => ({
                id: r.id,
                title: r.title,
                subtitle: `${t("cms.crp.itemSub", { name: r.department.name })}${r.period ? `[${r.period.title}] · ` : ""}${participation(r) ? t("cms.crp.itemPart", { p: participation(r) ?? "" }) : ""}${formatDate(r.createdAt)}`,
                href: `/chapter-reports/${r.id}`,
              }))}
            />
            <div className="max-sm:hidden rounded-xl border border-border bg-white shadow-sm overflow-hidden">
              <DataTable>
                <thead>
                  <tr>
                    <Th>{t("cms.crp.thTitle")}</Th>
                    <Th>{t("cms.crp.thChapter")}</Th>
                    <Th>{t("cms.crp.thPeriod")}</Th>
                    <Th>{t("cms.crp.thPart")}</Th>
                    <Th>{t("cms.crp.thDate")}</Th>
                    <Th className="text-right">{t("cms.crp.thActions")}</Th>
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
                          <span className="italic text-slate-400">{t("cms.crp.free")}</span>
                        )}
                      </Td>
                      <Td className="whitespace-nowrap text-xs font-semibold tabular-nums text-foreground">
                        {participation(r) ?? <span className="font-normal italic text-slate-400">{t("cms.crp.notRecorded")}</span>}
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
