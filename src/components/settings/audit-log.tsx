import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { intlLocale } from "@/lib/i18n/format";
import { formatDateTime, pageParam, str } from "@/utils";
import { CompactList } from "@/components/ui/compact-list";
import { DataTable, EmptyState, Pagination, StatusBadge, Td, Th } from "@/components/ui/misc";
import { FilterBar } from "@/components/ui/filter-bar";
import { getT, getLocale } from "@/lib/i18n/server";
import type { TFn } from "@/lib/i18n/translate";
import type { Locale } from "@/lib/i18n/config";
import { AUDIT_GROUPS, actionLabelT, actionTone, auditGroupLabelT, metaSummaryT, targetLabelT } from "@/lib/audit-labels";

const PAGE_SIZE = 20;
const ROLES = ["ADMIN", "SECRETARY", "MONITOR", "MEMBER", "DEPARTMENT_ACCOUNT"] as const;
const RANGE_VALUES = ["today", "7", "30"] as const;

const ago = (t: TFn, d: Date) => {
  const s = Math.max(0, (Date.now() - d.getTime()) / 1000);
  if (s < 60) return t("ui.time.nowLower"); if (s < 3600) return t("ui.time.min", { n: Math.floor(s / 60) }); if (s < 86400) return t("ui.time.hour", { n: Math.floor(s / 3600) });
  return t("ui.time.day", { n: Math.floor(s / 86400) });
};

/** Tên đối tượng bị tác động (người, hoạt động, bài viết…) lấy theo id; đối tượng đã bị xóa thì dùng thông tin ghi kèm trong nhật ký. */
async function resolveTargets(logs: { target: string; targetId: string | null }[], t: TFn) {
  const ids = (t: string) => [...new Set(logs.filter((l) => l.target === t && l.targetId).map((l) => l.targetId!))];
  const [users, members, activities, articles, depts, quizzes, polls, reports, badges, cats, actCats] = await Promise.all([
    db.user.findMany({ where: { id: { in: ids("User") } }, select: { id: true, fullName: true } }),
    db.member.findMany({ where: { id: { in: ids("Member") } }, select: { id: true, fullName: true, code: true } }),
    db.activity.findMany({ where: { id: { in: ids("Activity") } }, select: { id: true, title: true } }),
    db.article.findMany({ where: { id: { in: ids("Article") } }, select: { id: true, title: true } }),
    db.department.findMany({ where: { id: { in: ids("Department") } }, select: { id: true, name: true } }),
    db.quiz.findMany({ where: { id: { in: ids("Quiz") } }, select: { id: true, title: true } }),
    db.poll.findMany({ where: { id: { in: ids("Poll") } }, select: { id: true, question: true } }),
    db.chapterReport.findMany({ where: { id: { in: ids("ChapterReport") } }, select: { id: true, title: true } }),
    db.badge.findMany({ where: { id: { in: ids("Badge") } }, select: { id: true, name: true } }),
    db.articleCategory.findMany({ where: { id: { in: ids("ArticleCategory") } }, select: { id: true, name: true } }),
    db.activityCategory.findMany({ where: { id: { in: ids("ActivityCategory") } }, select: { id: true, name: true } }),
  ]);
  const map = new Map<string, string>();
  users.forEach((x) => map.set(`User:${x.id}`, x.fullName)); members.forEach((x) => map.set(`Member:${x.id}`, `${x.fullName} (${x.code})`));
  activities.forEach((x) => map.set(`Activity:${x.id}`, x.title)); articles.forEach((x) => map.set(`Article:${x.id}`, x.title));
  depts.forEach((x) => map.set(`Department:${x.id}`, t("ui.au.chapter", { name: x.name }))); quizzes.forEach((x) => map.set(`Quiz:${x.id}`, x.title));
  polls.forEach((x) => map.set(`Poll:${x.id}`, x.question)); reports.forEach((x) => map.set(`ChapterReport:${x.id}`, x.title));
  badges.forEach((x) => map.set(`Badge:${x.id}`, x.name)); cats.forEach((x) => map.set(`ArticleCategory:${x.id}`, x.name)); actCats.forEach((x) => map.set(`ActivityCategory:${x.id}`, x.name));
  return map;
}

/** Nhật ký hoạt động dễ đọc: mô tả hành động bằng tiếng Việt, hiện tên người và đối tượng thật, có lọc theo nhóm, người thực hiện, thời gian. */
export async function AuditLog({ searchParams, basePath }: { searchParams: Record<string, string | string[] | undefined>; basePath: string }) {
  const t = await getT();
  const locale: Locale = await getLocale();
  const RANGES = RANGE_VALUES.map((v) => ({ value: v, label: t(`ui.au.${v}`) }));
  const group = AUDIT_GROUPS.find((g) => g.value === str(searchParams.group));
  const who = (str(searchParams.q) ?? "").trim().slice(0, 60);
  const range = RANGES.find((r) => r.value === str(searchParams.range))?.value;
  const page = pageParam(searchParams.page);
  const since = range === "today" ? new Date(new Date().setHours(0, 0, 0, 0)) : range ? new Date(Date.now() - Number(range) * 86400_000) : null;
  const where: Prisma.AuditLogWhereInput = {
    AND: [
      group ? { OR: group.prefixes.map((p) => ({ action: { startsWith: p } })) } : {},
      who ? { user: { OR: [{ fullName: { contains: who, mode: "insensitive" } }, { username: { contains: who, mode: "insensitive" } }] } } : {},
      since ? { createdAt: { gte: since } } : {},
    ],
  };
  const [logs, total] = await Promise.all([
    db.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, include: { user: { select: { fullName: true, username: true, role: true } } } }),
    db.auditLog.count({ where }),
  ]);
  const names = await resolveTargets(logs, t);
  const rows = logs.map((l) => {
    const meta = l.metadata as Record<string, unknown> | null;
    const resolved = l.targetId ? names.get(`${l.target}:${l.targetId}`) : undefined;
    const fallback = (meta && (meta.title ?? meta.name ?? meta.code ?? meta.question ?? meta.username)) as string | undefined;
    const object = resolved ?? (fallback ? String(fallback) : l.targetId ? t("ui.au.deleted") : "");
    return {
      id: l.id, time: l.createdAt, action: actionLabelT(t, l.action), raw: l.action, tone: actionTone(l.action),
      who: l.user ? l.user.fullName : t("ui.au.guest"), role: l.user && (ROLES as readonly string[]).includes(l.user.role) ? t(`ui.role.${l.user.role as (typeof ROLES)[number]}`) : "",
      type: targetLabelT(t, l.target), object, detail: metaSummaryT(t, meta), ip: l.ipAddress ?? "",
    };
  });
  return (
    <>
      <p className="mb-3 text-sm text-muted">{t("ui.au.intro", { total: total.toLocaleString(intlLocale(locale)), filtered: group || who || range ? t("ui.au.filtered") : "" })}</p>
      <FilterBar oneRow fields={[
        { type: "search", name: "q", placeholder: t("ui.au.searchWho") },
        { type: "select", name: "group", label: t("ui.au.group"), options: AUDIT_GROUPS.map((g) => ({ value: g.value, label: auditGroupLabelT(t, g.value) })) },
        { type: "select", name: "range", label: t("ui.au.range"), options: RANGES },
      ]} />
      {rows.length === 0 ? <div className="rounded-lg border border-border bg-white/85"><EmptyState title={t("ui.au.emptyTitle")} description={t("ui.au.emptyDesc")} /></div> : (
        <>
        <CompactList items={rows.map((r) => ({ id: r.id, title: r.action, subtitle: `${r.who} · ${ago(t, r.time)}`, badge: undefined, value: undefined,
          details: [[t("ui.au.time"), formatDateTime(r.time, locale)], [t("ui.au.actor"), `${r.who}${r.role ? ` (${r.role})` : ""}`], [t("ui.au.action"), r.action], [t("ui.au.object"), r.object ? `${r.type}: ${r.object}` : r.type], ...(r.detail ? [[t("ui.au.detail"), r.detail] as [string, string]] : []), ...(r.ip ? [[t("ui.au.ip"), r.ip] as [string, string]] : [])] }))} />
        <div className="max-sm:hidden">
        <DataTable>
          <thead><tr><Th>{t("ui.au.time")}</Th><Th>{t("ui.au.actor")}</Th><Th>{t("ui.au.action")}</Th><Th>{t("ui.au.object")}</Th><Th>{t("ui.au.detail")}</Th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.id}>
              <Td className="whitespace-nowrap"><div>{formatDateTime(r.time, locale)}</div><div className="text-xs text-muted">{ago(t, r.time)}</div></Td>
              <Td><div className="font-medium">{r.who}</div>{r.role && <div className="text-xs text-muted">{r.role}</div>}</Td>
              <Td><StatusBadge tone={r.tone}>{r.action}</StatusBadge></Td>
              <Td>{r.object ? <><div className="font-medium break-words">{r.object}</div><div className="text-xs text-muted">{r.type}</div></> : <span className="text-muted">{r.type}</span>}</Td>
              <Td className="max-w-xs text-[13px] text-muted">{r.detail || "—"}{r.ip && <div className="text-xs">IP {r.ip}</div>}</Td>
            </tr>
          ))}</tbody>
        </DataTable>
        </div>
        </>
      )}
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath={basePath} params={{ group: group?.value, q: who, range }} />
    </>
  );
}
