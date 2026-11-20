import { getLocale, getT } from "@/lib/i18n/server";
import { intlLocale } from "@/lib/i18n/format";
import { getEduPolicy } from "@/lib/services/edu-policy";
import { deputiesAvailable, listDeputies } from "@/lib/services/class-deputies";
import { ActionsMenu } from "@/components/ui/actions-menu";
import { DepartmentPersonnel } from "@/components/members/department-personnel";
import { Tabs } from "@/components/ui/tabs";
import Link from "next/link";
import { CompactList } from "@/components/ui/compact-list";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { canManageDepartment } from "@/lib/permissions";
import { cohortLabel } from "@/lib/school-year";
import { formatDate, pageParam, str } from "@/utils";
import type { Prisma } from "@prisma/client";
import { Download } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { FilterBar } from "@/components/ui/filter-bar";
import { sortOptions, memberOrderBy } from "@/lib/member-sort";
import { inOrder, memberIdsByName } from "@/lib/services/member-name-sort";
import { ClickRow } from "@/components/ui/click-row";
import { MemberTable } from "@/components/members/member-table";
import { AddMembersButton, DeleteDepartmentButton, DepartmentAccountButton, DepartmentFormButton } from "@/components/members/department-actions";
import { Avatar, DataTable, EmptyState, PageHeader, Pagination, Section, Stat, Td, Th } from "@/components/ui/misc";

export async function generateMetadata() { const t = await getT(); return { title: t("dept.title") }; }

const PAGE_SIZE = 15;

export default async function DepartmentDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireRole(["ADMIN", "DEPARTMENT_ACCOUNT"]);
  const t = await getT(), nf = intlLocale(await getLocale());
  const { id } = await params;
  const sp = await searchParams;
  const page = pageParam(sp.page);
  const tab = str(sp.tab) === "personnel" ? "personnel" : "overview";
    const q = str(sp.q), kind = str(sp.kind), status = str(sp.status), sort = str(sp.sort);
  const mwhere: Prisma.MemberWhereInput = {
    departmentId: id,
    deletedAt: null,
    ...(q ? { OR: [{ fullName: { contains: q, mode: "insensitive" } }, { code: { contains: q, mode: "insensitive" } }] } : {}),
    ...(kind === "doanvien" ? { isDoanVien: true } : kind === "thanhnien" ? { isDoanVien: false } : {}),
    ...(status === "LOCKED" ? { user: { status: "LOCKED" } } : status ? { status: status as "ACTIVE" } : {}),
  };
  if (!canManageDepartment(user, id)) notFound(); // bí thư Chi đoàn A mở URL Chi đoàn B -> 404
  const dept = await db.department.findUnique({
    where: { id },
    include: {
      secretary: { select: { id: true, fullName: true, username: true } },
      account: { select: { username: true } },
      monitors: { select: { userId: true, user: { select: { fullName: true } } } },
      _count: { select: { members: { where: { deletedAt: null } } } },
    },
  });
  if (!dept) notFound();
  const byName = sort === "ten" || sort === "ten_z"; // xếp theo TÊN (từ cuối) theo thứ tự tiếng Việt
  const nameIds = byName ? (await memberIdsByName(mwhere, sort === "ten_z")).slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) : null;
  const [points, membersRaw, candidateRows, doanVienCount, allItems, filteredTotal] = await Promise.all([
    db.member.aggregate({ where: { departmentId: id, deletedAt: null }, _sum: { totalPoints: true } }),
    db.member.findMany({ where: nameIds ? { id: { in: nameIds } } : mwhere, orderBy: memberOrderBy(sort, [{ totalPoints: "desc" }, { fullName: "asc" }]), skip: nameIds ? undefined : (page - 1) * PAGE_SIZE, take: nameIds ? undefined : PAGE_SIZE, include: { user: { select: { status: true, mustChangePassword: true } } } }),
    db.member.findMany({ where: { departmentId: id, status: "ACTIVE", isDoanVien: true }, orderBy: { fullName: "asc" }, select: { id: true, userId: true, fullName: true, code: true } }),
    db.member.count({ where: { departmentId: id, isDoanVien: true, deletedAt: null } }),
    db.member.findMany({ where: mwhere, select: { id: true, isDoanVien: true }, take: 1000 }),
    db.member.count({ where: mwhere }),
  ]);
  const president = dept.presidentId ? await db.user.findUnique({ where: { id: dept.presidentId }, select: { fullName: true, member: { select: { id: true } } } }) : null;
  const presidentCandidates = await db.member.findMany({ where: { departmentId: id, status: "ACTIVE", user: { status: "ACTIVE" } }, select: { id: true, fullName: true }, orderBy: { fullName: "asc" } });
  const [deputies, deputiesEnabled] = tab === "personnel" ? await Promise.all([listDeputies(id), deputiesAvailable()]) : [[], false];
  const members = nameIds ? inOrder(membersRaw, nameIds) : membersRaw;
  const policy = await getEduPolicy();
  const actionItems = <>
    <a href={`/api/members/export?dept=${dept.id}`} className={buttonClass("secondary")}><Download className="size-4" />{t("members.export")}<span className="max-sm:hidden"> Excel</span></a>
    {policy.profiles && policy.placement && <AddMembersButton departmentId={dept.id} departmentName={dept.name} />}
    {user.role === "ADMIN" && <DepartmentAccountButton departmentId={dept.id} account={dept.account} />}
    {user.role === "ADMIN" && (dept.isTeacher || policy.classes) && <DepartmentFormButton dept={{ id: dept.id, name: dept.name, description: dept.description, startYear: dept.startYear, isTeacher: dept.isTeacher }} />}
    {user.role === "ADMIN" && (dept.isTeacher || policy.classes) && <DeleteDepartmentButton id={dept.id} name={dept.name} />}
  </>;
  return (
    <>
      <PageHeader title={t("dept.chapterName", { name: dept.name })} description={`${dept.isTeacher ? t("dept.teacherChapter") + " · " : ""}${dept.startYear ? t("dept.cohortOf", { y: cohortLabel(dept.startYear) }) : ""}${dept.graduatedAt ? " · " + t("dept.graduated2") : ""}`}
        actions={dept.graduatedAt ? undefined : <>
          <ActionsMenu>{actionItems}</ActionsMenu>
        </>} />
      {!dept.graduatedAt && <Tabs current={`?tab=${tab}`} items={[["?tab=overview", t("dept.tabOverview")], ["?tab=personnel", t("dept.tabPersonnel")]]} />}
      {tab === "personnel" && !dept.graduatedAt ? <DepartmentPersonnel departmentId={id} deputies={deputies} deputiesEnabled={deputiesEnabled} president={president ? { id: president.member?.id ?? null, name: president.fullName } : null}
        secretary={dept.secretary ? { id: dept.secretary.id, fullName: dept.secretary.fullName } : null} monitors={dept.monitors.map((m) => ({ userId: m.userId, fullName: m.user.fullName }))}
        candidates={candidateRows.map((m) => ({ id: m.id, userId: m.userId, label: `${m.fullName} (${m.code})` }))} presidentCandidates={presidentCandidates.map((m) => ({ id: m.id, userId: m.id, label: m.fullName }))}
        showPresident={!dept.isTeacher} canEditPresident={user.role === "ADMIN"} canEdit /> : <>
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
        <Stat label={t("members.students")} value={dept._count.members} />
        <Stat label={t("members.doanVien")} value={doanVienCount} />
        <Stat label={t("members.youth")} value={dept._count.members - doanVienCount} />
        <Stat label={t("dept.totalPoints")} value={(points._sum.totalPoints ?? 0).toLocaleString(nf)} />
      </div>
      <div className="mt-6">
      <>
        <FilterBar oneRow slotId="member-select-slot" className="mb-3" fields={[
          { type: "search", name: "q", placeholder: t("members.searchPh") },
          { type: "select", name: "kind", label: t("members.f.kind"), options: [{ value: "doanvien", label: t("members.doanVien") }, { value: "thanhnien", label: t("members.f.kindYouth") }] },
          { type: "select", name: "status", label: t("members.f.status"), options: [{ value: "ACTIVE", label: t("members.st.ACTIVE") }, { value: "TRANSFERRED", label: t("members.st.TRANSFERRED") }, { value: "GRADUATED", label: t("members.st.GRADUATED") }, { value: "LOCKED", label: t("members.st.LOCKED") }] },
          { type: "select", name: "sort", label: t("dept.sortPoints"), options: sortOptions(t) },
        ]} />
        {members.length === 0 ? <EmptyState title={q || kind || status ? t("members.noMatch") : t("dept.noMembers")} /> : (
          <>
          <CompactList items={members.map((m) => ({ id: m.id, title: m.fullName, subtitle: m.code, leading: <Avatar name={m.fullName} src={m.avatarUrl} size={28} />, value: m.totalPoints,
            href: `/members/${m.id}`, hrefLabel: t("members.viewProfile"), details: [[t("members.code"), m.code], [t("members.joinedAt"), m.isDoanVien ? formatDate(m.joinedAt) : t("members.notJoined")], [t("dept.points"), m.totalPoints]] }))} />
          <div className="max-sm:hidden">
          <MemberTable canManage canDelete={policy.profiles} showPoints allItems={allItems} rows={members.map((m) => ({
            id: m.id, code: m.code, fullName: m.fullName, avatarUrl: m.avatarUrl, isDoanVien: m.isDoanVien, joinedAt: m.joinedAt?.toISOString() ?? null,
            status: m.status, locked: m.user.status === "LOCKED", activated: !m.user.mustChangePassword, points: m.totalPoints,
          }))} />
          </div>
          </>
        )}
        <Pagination page={page} pageSize={PAGE_SIZE} total={filteredTotal} basePath={`/departments/${id}`} params={{ q, kind, status, sort }} />
      </>
      </div>
      </>}
    </>
  );
}
