import { getT } from "@/lib/i18n/server";
import { getEduPolicy } from "@/lib/services/edu-policy";
import Link from "next/link";
import { ClickRow } from "@/components/ui/click-row";
import { CompactList } from "@/components/ui/compact-list";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { pageParam, str } from "@/utils";
import type { Prisma } from "@prisma/client";
import { FilterBar } from "@/components/ui/filter-bar";
import { gradeOptions, gradeOf } from "@/lib/member-sort";
import { DataTable, EmptyState, PageHeader, Pagination, Td, Th } from "@/components/ui/misc";
import { cohortLabel } from "@/lib/school-year";
import { DeleteDepartmentButton, DepartmentFormButton, SecretaryButton, SyncSchoolYearButton } from "@/components/members/department-actions";

export async function generateMetadata() { const t = await getT(); return { title: t("dept.title") }; }

const PAGE_SIZE = 15;

export default async function DepartmentsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireRole(["ADMIN"]);
  const t = await getT();
  const isAdmin = user.role === "ADMIN";
  const sp = await searchParams;
  const page = pageParam(sp.page);
  const graduated = sp.ra_truong === "1";
  const khoi = gradeOf(str(sp.khoi)), q = str(sp.q), sort = str(sp.sort), obj = str(sp.obj) === "gv" ? "gv" : str(sp.obj) === "hs" ? "hs" : "";
  const where: Prisma.DepartmentWhereInput = isAdmin
    ? { deletedAt: null, graduatedAt: graduated ? { not: null } : null, ...(obj ? { isTeacher: obj === "gv" } : {}), ...(khoi || q ? { name: { ...(khoi ? { contains: khoi } : {}), ...(q ? { contains: q, mode: "insensitive" as const } : {}) } } : {}) }
    : { id: user.departmentId ?? "__none__" };
  const [allDepts, memberRows] = await Promise.all([
    db.department.findMany({
      where, orderBy: { name: "asc" },
      include: { secretary: { select: { id: true, fullName: true, username: true } }, _count: { select: { members: { where: { deletedAt: null } } } } },
    }),
    isAdmin
      ? db.member.findMany({ where: { status: "ACTIVE", isDoanVien: true, department: { graduatedAt: null } }, orderBy: { fullName: "asc" }, select: { id: true, userId: true, fullName: true, code: true, departmentId: true } })
      : Promise.resolve([]),
  ]);
  const nat = (a: string, b: string) => a.localeCompare(b, "vi", { numeric: true });
  const sorters: Record<string, (a: (typeof allDepts)[number], b: (typeof allDepts)[number]) => number> = {
    ten_z: (a, b) => nat(b.name, a.name),
    sl_giam: (a, b) => b._count.members - a._count.members || nat(a.name, b.name),
    sl_tang: (a, b) => a._count.members - b._count.members || nat(a.name, b.name),
    khoa_moi: (a, b) => (b.startYear ?? 0) - (a.startYear ?? 0) || nat(a.name, b.name),
    khoa_cu: (a, b) => (a.startYear ?? 9999) - (b.startYear ?? 9999) || nat(a.name, b.name),
  };
  const sorted = [...allDepts].sort(sorters[sort ?? ""] ?? ((a, b) => nat(a.name, b.name)));
  const policy = await getEduPolicy();
  const totalDepts = sorted.length;
  const departments = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <PageHeader title={isAdmin ? t("dept.title") : t("dept.mine")} description={isAdmin ? t("dept.count", { n: totalDepts, state: graduated ? t("dept.graduated") : t("dept.studying") }) : undefined}
        actions={isAdmin && <>{policy.placement && <SyncSchoolYearButton />}{policy.classes && <DepartmentFormButton />}</>} />
      {isAdmin && (
        <FilterBar leading={
          <div className="flex gap-1 text-sm">
            <Link href="/departments" className={`rounded-md px-3 py-2 ${!graduated ? "bg-primary text-white" : "bg-white/85 hover:bg-slate-100"}`}>{t("dept.tabStudying")}</Link>
            <Link href="/departments?ra_truong=1" className={`rounded-md px-3 py-2 ${graduated ? "bg-primary text-white" : "bg-white/85 hover:bg-slate-100"}`}>{t("dept.tabGraduated")}</Link>
          </div>
        } fields={[
          { type: "search", name: "q", placeholder: t("dept.searchPh") },
          { type: "select", name: "obj", label: t("members.f.obj"), options: [{ value: "hs", label: t("members.students") }, { value: "gv", label: t("members.teachers") }] },
          { type: "select", name: "khoi", label: t("members.f.grade"), options: gradeOptions(t) },
          { type: "select", name: "sort", label: t("dept.sortLabel"), options: [
            { value: "ten_z", label: t("dept.sort.zA") }, { value: "sl_giam", label: t("dept.sort.most") }, { value: "sl_tang", label: t("dept.sort.least") },
            { value: "khoa_moi", label: t("dept.sort.newCohort") }, { value: "khoa_cu", label: t("dept.sort.oldCohort") }] },
        ]} />
      )}
      {departments.length === 0 ? (
        <div className="rounded-lg border border-border bg-white/85"><EmptyState title={t("dept.none")} description={t("dept.noneHint")} action={isAdmin ? <DepartmentFormButton /> : undefined} /></div>
      ) : (
        <>
        <CompactList items={departments.map((d, i) => ({
          id: d.id, title: `${t("dept.chapterName", { name: d.name })}${d.isTeacher ? ` (${t("dept.teacherLc")})` : d.startYear ? ` (${cohortLabel(d.startYear)})` : ""}`, subtitle: d.secretary ? t("dept.secretaryIs", { name: d.secretary.fullName }) : graduated ? t("dept.graduated2") : t("dept.noSecretary"), value: t("dept.hs", { n: d._count.members }),
          href: `/departments/${d.id}`,
        }))} />
        <div className="max-sm:hidden">
        <DataTable>
          <thead><tr><Th>{t("members.f.dept")}</Th><Th>{t("dept.cohortYears")}</Th><Th>{t("dept.secretary")}</Th><Th className="text-right">{t("members.doanVien")}</Th>{isAdmin && <Th />}</tr></thead>
          <tbody>
            {departments.map((d, i) => (
              <ClickRow key={d.id} href={`/departments/${d.id}`}>
                <Td><Link href={`/departments/${d.id}`} className="font-medium text-primary hover:underline">{d.name}</Link>{d.isTeacher && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-800">{t("members.teachers")}</span>}</Td>
                <Td className="whitespace-nowrap">{d.isTeacher ? "—" : cohortLabel(d.startYear) || "—"}</Td>
                <Td>{d.secretary ? d.secretary.fullName : <span className="text-muted">{t("dept.unassigned")}</span>}</Td>
                <Td className="text-right tabular-nums">{d._count.members}</Td>
                {isAdmin && (
                  <Td className="text-right whitespace-nowrap">
                    <SecretaryButton departmentId={d.id} current={d.secretary} candidates={memberRows.filter((m) => m.departmentId === d.id).map((m) => ({ id: m.id, userId: m.userId, label: `${m.fullName} (${m.code})` }))} />
                    {(d.isTeacher || policy.classes) && <DepartmentFormButton dept={{ id: d.id, name: d.name, description: d.description, startYear: d.startYear, isTeacher: d.isTeacher }} />}
                    {(d.isTeacher || policy.classes) && <DeleteDepartmentButton id={d.id} name={d.name} />}
                  </Td>
                )}
              </ClickRow>
            ))}
          </tbody>
        </DataTable>
        </div>
        </>
      )}
      <Pagination page={page} pageSize={PAGE_SIZE} total={totalDepts} basePath="/departments" params={{ ra_truong: graduated ? "1" : "", q, khoi, sort }} />
    </>
  );
}
