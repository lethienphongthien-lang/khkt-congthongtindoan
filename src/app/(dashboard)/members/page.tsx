import { getLocale, getT } from "@/lib/i18n/server";
import { intlLocale } from "@/lib/i18n/format";
import { getEduPolicy } from "@/lib/services/edu-policy";
import Link from "next/link";
import { ClickRow } from "@/components/ui/click-row";
import { CompactList } from "@/components/ui/compact-list";
import { Download, Plus, Upload } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { memberScope } from "@/lib/services/queries";
import { formatDate, pageParam, str } from "@/utils";
import { buttonClass } from "@/components/ui/button";
import { Avatar, DataTable, EmptyState, PageHeader, Pagination, Stat, Td, Th } from "@/components/ui/misc";
import { ActionsMenu } from "@/components/ui/actions-menu";
import { FilterBar } from "@/components/ui/filter-bar";
import { MemberTable } from "@/components/members/member-table";
import { gradeOptions, sortOptions, gradeOf, memberOrderBy } from "@/lib/member-sort";
import { ImportMembersButton } from "@/components/members/import-members";
import { inOrder, memberIdsByName } from "@/lib/services/member-name-sort";

export async function generateMetadata() { const t = await getT(); return { title: t("members.title") }; }
const PAGE_SIZE = 15;

export default async function MembersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireRole(["ADMIN", "SECRETARY", "DEPARTMENT_ACCOUNT"]);
  const t = await getT(), nf = intlLocale(await getLocale());
  const sp = await searchParams;
  const q = str(sp.q), dept = str(sp.dept), cohort = str(sp.cohort), status = str(sp.status), kind = str(sp.kind), khoi = gradeOf(str(sp.khoi)), sort = str(sp.sort), obj = str(sp.obj) === "gv" ? "gv" : str(sp.obj) === "hs" ? "hs" : "";
  const page = pageParam(sp.page);

  const exportQuery = (() => { const p = new URLSearchParams(); for (const [k, v] of Object.entries({ q, dept, khoi, kind, cohort, status, obj })) if (v) p.set(k, v); const t = p.toString(); return t ? `?${t}` : ""; })();
  const where: Prisma.MemberWhereInput = {
    AND: [
      memberScope(user),
      q ? { OR: [{ fullName: { contains: q, mode: "insensitive" } }, { code: { contains: q, mode: "insensitive" } }] } : {},
      dept && user.role === "ADMIN" ? { departmentId: dept } : {},
      obj === "gv" ? { department: { isTeacher: true } } : obj === "hs" ? { department: { isTeacher: false } } : {},
      khoi ? { department: { name: { contains: khoi, mode: "insensitive" } } } : {}, // tên Chi đoàn có thể có tiền tố, ví dụ "CHI ĐOÀN 12C2"
      cohort ? { cohort: Number(cohort) || -1 } : {},
      kind === "doanvien" ? { isDoanVien: true } : kind === "thanhnien" ? { isDoanVien: false } : {},
      status === "LOCKED" ? { user: { status: "LOCKED" } } : status ? { status: status as "ACTIVE" } : {},
    ],
  };
  const byName = sort === "ten" || sort === "ten_z"; // xếp theo TÊN (từ cuối) theo thứ tự tiếng Việt, làm ở tầng ứng dụng
  const nameIds = byName ? (await memberIdsByName(where, sort === "ten_z")).slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) : null;
  const [membersRaw, total, departments, cohorts, allItems, scopeTotal, scopeDoanVien] = await Promise.all([
    db.member.findMany({
      where: nameIds ? { id: { in: nameIds } } : where, orderBy: memberOrderBy(sort, [{ department: { name: "asc" } }, { fullName: "asc" }]), skip: nameIds ? undefined : (page - 1) * PAGE_SIZE, take: nameIds ? undefined : PAGE_SIZE,
      include: { department: true, user: { select: { status: true, mustChangePassword: true } } },
    }),
    db.member.count({ where }),
    user.role === "ADMIN" ? db.department.findMany({ where: { graduatedAt: null }, orderBy: { name: "asc" } }) : Promise.resolve([]),
    db.member.findMany({ where: memberScope(user), distinct: ["cohort"], select: { cohort: true }, orderBy: { cohort: "desc" } }),
    user.role === "ADMIN" ? db.member.findMany({ where, select: { id: true, isDoanVien: true }, take: 1000 }) : Promise.resolve([]),
    db.member.count({ where: { AND: [memberScope(user), { department: { isTeacher: obj === "gv" } }] } }),
    db.member.count({ where: { AND: [memberScope(user), { department: { isTeacher: obj === "gv" } }, { isDoanVien: true }] } }),
  ]);

  const members = nameIds ? inOrder(membersRaw, nameIds) : membersRaw;
  const policy = await getEduPolicy();
  return (
    <>
      <PageHeader
        title={t("members.title")}
        description={user.role !== "ADMIN" ? t("members.titleOf", { name: user.departmentName ?? "" }) : undefined}
        actions={user.role === "ADMIN" && (
          <ActionsMenu>
            <a href={`/api/members/export${exportQuery}`} className={buttonClass("secondary")}><Download className="size-4" />{t("members.export")}<span className="max-sm:hidden"> Excel</span></a>
            {policy.profiles && policy.placement && <ImportMembersButton />}
            {policy.profiles && policy.placement && <Link href="/members/new" className={buttonClass()}><Plus className="size-4" />{t("members.add")}<span className="max-sm:hidden"> {t("members.addMember")}</span></Link>}
          </ActionsMenu>
        )}
      />
      <div className="mb-4 grid max-w-md grid-cols-3 gap-6">
        <Stat label={obj === "gv" ? t("members.teachers") : t("members.students")} value={scopeTotal.toLocaleString(nf)} />
        <Stat label={t("members.doanVien")} value={scopeDoanVien.toLocaleString(nf)} />
        <Stat label={obj === "gv" ? t("members.notJoined") : t("members.youth")} value={(scopeTotal - scopeDoanVien).toLocaleString(nf)} />
      </div>
      <FilterBar oneRow slotId={user.role === "ADMIN" ? "member-select-slot" : undefined} fields={[
        { type: "search", name: "q", placeholder: t("members.searchPh") },
        ...(user.role === "ADMIN" ? [{ type: "select" as const, name: "obj", label: t("members.f.obj"), options: [{ value: "hs", label: t("members.students") }, { value: "gv", label: t("members.teachers") }] }] : []),
        ...(user.role === "ADMIN" ? [{ type: "select" as const, name: "dept", label: t("members.f.dept"), options: departments.map((d) => ({ value: d.id, label: d.name })) }] : []),
        ...(user.role === "ADMIN" ? [{ type: "select" as const, name: "khoi", label: t("members.f.grade"), options: gradeOptions(t) }] : []),
        { type: "select", name: "kind", label: t("members.f.kind"), options: [{ value: "doanvien", label: t("members.doanVien") }, { value: "thanhnien", label: t("members.f.kindYouth") }] },
        { type: "select", name: "cohort", label: t("members.f.cohort"), options: cohorts.filter((c) => c.cohort).map((c) => ({ value: String(c.cohort), label: t("members.f.cohortN", { n: c.cohort ?? "" }) })) },
        { type: "select", name: "status", label: t("members.f.status"), options: [
          { value: "ACTIVE", label: t("members.st.ACTIVE") }, { value: "TRANSFERRED", label: t("members.st.TRANSFERRED") },
          { value: "GRADUATED", label: t("members.st.GRADUATED") }, { value: "LOCKED", label: t("members.st.LOCKED") }] },
        { type: "select", name: "sort", label: t("members.f.sort"), options: sortOptions(t) },
      ]} />
      {members.length === 0 ? (
        <div className="rounded-lg border border-border bg-white/85"><EmptyState title={q || dept || cohort || status || kind || khoi ? t("members.noMatch") : t("members.none")} description={q || dept || cohort || status || kind || khoi ? t("members.tryFilters") : user.role === "ADMIN" ? t("members.noneAdminHint") : t("members.noneChapterHint")}
          action={q || dept || cohort || status || kind || khoi ? <Link href="/members" className={buttonClass("secondary")}>{t("members.clearFilters")}</Link> : user.role === "ADMIN" ? <Link href="/members/new" className={buttonClass()}>{t("members.addFirst")}</Link> : undefined} /></div>
      ) : (
        <>
        <CompactList items={members.map((m) => ({
          id: m.id, title: m.fullName, subtitle: `${m.code} · ${m.department.name}`, leading: <Avatar name={m.fullName} src={m.avatarUrl} size={28} />,
          href: `/members/${m.id}`, hrefLabel: t("members.viewProfile"),
          details: [[t("members.code"), m.code], [t("members.f.dept"), m.department.name], [t("members.joinedAt"), m.isDoanVien ? formatDate(m.joinedAt) : t("members.notJoined")]],
        }))} />
        <div className="max-sm:hidden">
        <MemberTable canManage={user.role === "ADMIN"} canDelete={policy.profiles} showDepartment allItems={allItems} rows={members.map((m) => ({
          id: m.id, code: m.code, fullName: m.fullName, avatarUrl: m.avatarUrl, isDoanVien: m.isDoanVien, joinedAt: m.joinedAt?.toISOString() ?? null,
          status: m.status, locked: m.user.status === "LOCKED", activated: !m.user.mustChangePassword, department: m.department.name,
        }))} />
        </div>
        </>
      )}
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath="/members" params={{ q, dept, cohort, status, kind, khoi, sort }} />
    </>
  );
}
