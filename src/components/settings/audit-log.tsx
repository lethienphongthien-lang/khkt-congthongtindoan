import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { formatDateTime, pageParam, str } from "@/utils";
import { CompactList } from "@/components/ui/compact-list";
import { DataTable, EmptyState, Pagination, StatusBadge, Td, Th } from "@/components/ui/misc";
import { FilterBar } from "@/components/ui/filter-bar";
import { AUDIT_GROUPS, TARGET_LABELS, actionLabel, actionTone, metaSummary } from "@/lib/audit-labels";

const PAGE_SIZE = 20;
const ROLE: Record<string, string> = { ADMIN: "Quản trị", SECRETARY: "Bí thư", MEMBER: "Đoàn viên" };
const RANGES = [{ value: "today", label: "Hôm nay" }, { value: "7", label: "7 ngày qua" }, { value: "30", label: "30 ngày qua" }];

const ago = (d: Date) => {
  const s = Math.max(0, (Date.now() - d.getTime()) / 1000);
  if (s < 60) return "vừa xong"; if (s < 3600) return `${Math.floor(s / 60)} phút trước`; if (s < 86400) return `${Math.floor(s / 3600)} giờ trước`;
  return `${Math.floor(s / 86400)} ngày trước`;
};

/** Tên đối tượng bị tác động (người, hoạt động, bài viết…) lấy theo id; đối tượng đã bị xóa thì dùng thông tin ghi kèm trong nhật ký. */
async function resolveTargets(logs: { target: string; targetId: string | null }[]) {
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
  depts.forEach((x) => map.set(`Department:${x.id}`, `Chi đoàn ${x.name}`)); quizzes.forEach((x) => map.set(`Quiz:${x.id}`, x.title));
  polls.forEach((x) => map.set(`Poll:${x.id}`, x.question)); reports.forEach((x) => map.set(`ChapterReport:${x.id}`, x.title));
  badges.forEach((x) => map.set(`Badge:${x.id}`, x.name)); cats.forEach((x) => map.set(`ArticleCategory:${x.id}`, x.name)); actCats.forEach((x) => map.set(`ActivityCategory:${x.id}`, x.name));
  return map;
}

/** Nhật ký hoạt động dễ đọc: mô tả hành động bằng tiếng Việt, hiện tên người và đối tượng thật, có lọc theo nhóm, người thực hiện, thời gian. */
export async function AuditLog({ searchParams, basePath }: { searchParams: Record<string, string | string[] | undefined>; basePath: string }) {
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
  const names = await resolveTargets(logs);
  const rows = logs.map((l) => {
    const meta = l.metadata as Record<string, unknown> | null;
    const resolved = l.targetId ? names.get(`${l.target}:${l.targetId}`) : undefined;
    const fallback = (meta && (meta.title ?? meta.name ?? meta.code ?? meta.question ?? meta.username)) as string | undefined;
    const object = resolved ?? (fallback ? String(fallback) : l.targetId ? "(đã bị xóa)" : "");
    return {
      id: l.id, time: l.createdAt, action: actionLabel(l.action), raw: l.action, tone: actionTone(l.action),
      who: l.user ? l.user.fullName : "Khách (không đăng nhập)", role: l.user ? ROLE[l.user.role] ?? "" : "",
      type: TARGET_LABELS[l.target] ?? l.target, object, detail: metaSummary(meta), ip: l.ipAddress ?? "",
    };
  });
  return (
    <>
      <p className="mb-3 text-sm text-muted">Ghi lại ai đã làm gì, vào lúc nào. Dùng để kiểm tra khi có thay đổi bất thường. Tổng cộng {total.toLocaleString("vi-VN")} dòng{group || who || range ? " khớp bộ lọc" : ""}.</p>
      <FilterBar oneRow fields={[
        { type: "search", name: "q", placeholder: "Tìm theo tên người thực hiện..." },
        { type: "select", name: "group", label: "Nhóm hành động", options: AUDIT_GROUPS.map((g) => ({ value: g.value, label: g.label })) },
        { type: "select", name: "range", label: "Mọi thời gian", options: RANGES },
      ]} />
      {rows.length === 0 ? <div className="rounded-lg border border-border bg-white/85"><EmptyState title="Không có thao tác nào" description="Thử bỏ bớt bộ lọc." /></div> : (
        <>
        <CompactList items={rows.map((r) => ({ id: r.id, title: r.action, subtitle: `${r.who} · ${ago(r.time)}`, badge: undefined, value: undefined,
          details: [["Thời gian", formatDateTime(r.time)], ["Người thực hiện", `${r.who}${r.role ? ` (${r.role})` : ""}`], ["Hành động", r.action], ["Đối tượng", r.object ? `${r.type}: ${r.object}` : r.type], ...(r.detail ? [["Chi tiết", r.detail] as [string, string]] : []), ...(r.ip ? [["Địa chỉ IP", r.ip] as [string, string]] : [])] }))} />
        <div className="max-sm:hidden">
        <DataTable>
          <thead><tr><Th>Thời gian</Th><Th>Người thực hiện</Th><Th>Hành động</Th><Th>Đối tượng</Th><Th>Chi tiết</Th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.id}>
              <Td className="whitespace-nowrap"><div>{formatDateTime(r.time)}</div><div className="text-xs text-muted">{ago(r.time)}</div></Td>
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
