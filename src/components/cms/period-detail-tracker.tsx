"use client";
import { useT } from "@/lib/i18n/client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, CheckCircle2, AlertCircle, Eye, ExternalLink, Calendar, Users, Clock, Send } from "lucide-react";
import { formatDate } from "@/utils";
import { buttonClass } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { DataTable, Td, Th } from "@/components/ui/misc";

export interface DeptReportItem {
  department: {
    id: string;
    name: string;
    isTeacher: boolean;
    secretary?: {
      id: string;
      fullName: string;
      username?: string | null;
      position?: string | null;
    } | null;
  };
  memberCount: number; // sĩ số đoàn viên đang hoạt động của Chi đoàn
  report?: {
    id: string;
    title: string;
    createdAt: Date | string;
    viewCount: number;
    participantCount?: number | null;
  } | null;
}

export function PeriodDetailTracker({
  period,
  items,
}: {
  period: {
    id: string;
    title: string;
    description?: string | null;
    startDate?: Date | string | null;
    endDate?: Date | string | null;
    academicYear?: string | null;
    status: string;
  };
  items: DeptReportItem[];
}) {
  const t = useT();
  const [filter, setFilter] = useState<"ALL" | "SUBMITTED" | "MISSING">("ALL");
  const [gradeFilter, setGradeFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  const total = items.length;
  const submittedCount = useMemo(() => items.filter((i) => !!i.report).length, [items]);
  const missingCount = total - submittedCount;
  const percentage = total > 0 ? Math.round((submittedCount / total) * 100) : 0;

  // Lấy danh sách các khối lớp
  const grades = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      if (item.department.isTeacher) {
        set.add("gv");
      } else {
        const match = item.department.name.match(/^\d+/);
        if (match) set.add(match[0]);
      }
    }
    return Array.from(set).sort((a, b) => {
      if (a === "gv") return 1;
      if (b === "gv") return -1;
      return Number(a) - Number(b);
    });
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((i) => {
      // Bộ lọc nộp / chưa nộp
      if (filter === "SUBMITTED" && !i.report) return false;
      if (filter === "MISSING" && !!i.report) return false;

      // Bộ lọc khối
      if (gradeFilter !== "ALL") {
        if (gradeFilter === "gv" && !i.department.isTeacher) return false;
        if (gradeFilter !== "gv") {
          const match = i.department.name.match(/^\d+/);
          if (!match || match[0] !== gradeFilter) return false;
        }
      }

      // Bộ lọc tìm kiếm
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const deptMatch = i.department.name.toLowerCase().includes(q);
        const secMatch = i.department.secretary?.fullName.toLowerCase().includes(q);
        const reportMatch = i.report?.title.toLowerCase().includes(q);
        if (!deptMatch && !secMatch && !reportMatch) return false;
      }

      return true;
    });
  }, [items, filter, gradeFilter, search]);

  return (
    <div className="space-y-6">
      {/* Thẻ tóm tắt tiến độ */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-medium text-muted uppercase tracking-wider">
            <Users className="size-4 text-primary" /> {t("cms.pt.total")}
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">{total}</div>
        </div>

        <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 uppercase tracking-wider">
            <CheckCircle2 className="size-4" /> {t("cms.pt.submitted")}
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600">
            {submittedCount}{" "}
            <span className="text-sm font-normal text-muted">({percentage}%)</span>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-medium text-rose-600 uppercase tracking-wider">
            <AlertCircle className="size-4" /> {t("cms.pt.missing")}
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-600">{missingCount}</div>
        </div>

        <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-medium text-muted uppercase tracking-wider">
            <Clock className="size-4 text-amber-500" /> {t("cms.pt.periodStatus")}
          </div>
          <div className="mt-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                period.status === "OPEN"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              {period.status === "OPEN" ? t("cms.pt.open") : t("cms.pt.closed")}
            </span>
          </div>
        </div>
      </div>

      {/* Thanh tiến độ */}
      <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-foreground">{t("cms.pt.progress")}</span>
          <span className="font-bold text-primary">{t("cms.pt.pct", { n: percentage })}</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full transition-all duration-500 ${
              percentage === 100 ? "bg-emerald-500" : "bg-primary"
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Thanh công cụ lọc & tìm kiếm */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilter("ALL")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === "ALL"
                ? "bg-primary text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {t("cms.pt.all", { n: total })}
          </button>
          <button
            type="button"
            onClick={() => setFilter("SUBMITTED")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === "SUBMITTED"
                ? "bg-emerald-600 text-white"
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            }`}
          >
            {t("cms.pt.submittedN", { n: submittedCount })}
          </button>
          <button
            type="button"
            onClick={() => setFilter("MISSING")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === "MISSING"
                ? "bg-rose-600 text-white"
                : "bg-rose-50 text-rose-700 hover:bg-rose-100"
            }`}
          >
            {t("cms.pt.missingN", { n: missingCount })}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
            className="h-9 w-auto min-w-[150px] shrink-0 text-xs"
          >
            <option value="ALL">{t("cms.pt.allGrades")}</option>
            {grades.map((g) => (
              <option key={g} value={g}>
                {g === "gv" ? t("cms.pt.teachers") : t("cms.pt.grade", { g })}
              </option>
            ))}
          </Select>

          <div className="relative w-52 sm:w-64 shrink-0">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("cms.pt.search")}
              className="h-9 pl-8 text-xs"
            />
          </div>
        </div>
      </div>

      {/* Danh sách Chi đoàn */}
      {filteredItems.length === 0 ? (
        <div className="rounded-xl border border-border bg-white p-8 text-center text-sm text-muted">
          {t("cms.pt.none")}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
          <DataTable>
            <thead>
              <tr>
                <Th>{t("cms.pt.thChapter")}</Th>
                <Th>{t("cms.pt.thSec")}</Th>
                <Th>{t("cms.pt.thStatus")}</Th>
                <Th>{t("cms.pt.thPart")}</Th>
                <Th className="text-right">{t("cms.pt.thActions")}</Th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map(({ department, report, memberCount }) => (
                <tr key={department.id} className="hover:bg-slate-50/80 transition-colors">
                  <Td className="font-semibold text-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-primary/40" />
                      {department.name}
                      {department.isTeacher && (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-muted">
                          {t("cms.pt.teacher")}
                        </span>
                      )}
                    </span>
                  </Td>

                  <Td className="text-xs text-muted">
                    {department.secretary ? (
                      <div>
                        <div className="font-medium text-foreground">
                          {department.secretary.fullName}
                        </div>
                        {department.secretary.position && (
                          <div className="text-[11px] text-muted">{department.secretary.position}</div>
                        )}
                      </div>
                    ) : (
                      <span className="italic text-slate-400">{t("cms.pt.unassigned")}</span>
                    )}
                  </Td>

                  <Td>
                    {report ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="size-3.5 text-emerald-600" />
                        {t("cms.pt.reported")}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 border border-rose-200">
                        <AlertCircle className="size-3.5 text-rose-500" />
                        {t("cms.pt.missing")}
                      </span>
                    )}
                  </Td>

                  <Td className="whitespace-nowrap text-xs tabular-nums">
                    {report && report.participantCount != null ? (
                      <div>
                        <span className="text-sm font-semibold text-foreground">{report.participantCount}</span>
                        <span className="text-muted">/{memberCount}</span>
                        {memberCount > 0 && <div className="text-[11px] text-muted">{t("cms.pt.ofSize", { n: Math.round((report.participantCount / memberCount) * 100) })}</div>}
                      </div>
                    ) : (
                      <span className="italic text-slate-400">{report ? t("cms.pt.notRecorded") : "—"}</span>
                    )}
                  </Td>

                  <Td className="text-right">
                    {report ? (
                      <div className="inline-flex items-center gap-1">
                        <Link
                          href={`/chapter-reports/${report.id}`}
                          className={buttonClass("secondary", "sm")}
                          title={t("cms.pt.viewTitle")}
                        >
                          <Eye className="size-3.5" />
                          {t("cms.pt.view")}
                        </Link>
                        <Link
                          href={`/bao-cao-chi-doan/bao-cao/${report.id}`}
                          target="_blank"
                          className={buttonClass("ghost", "sm")}
                          title={t("cms.pt.viewPublic")}
                        >
                          <ExternalLink className="size-3.5 text-muted" />
                        </Link>
                      </div>
                    ) : (
                      <Link
                        href={`/chapter-reports/new?periodId=${period.id}&departmentId=${department.id}`}
                        className={buttonClass("ghost", "sm")}
                        title={t("cms.pt.postFor")}
                      >
                        <Send className="size-3.5" />
                        {t("cms.pt.postForBtn")}
                      </Link>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </div>
      )}
    </div>
  );
}

