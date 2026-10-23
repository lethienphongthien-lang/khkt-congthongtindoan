import Link from "next/link";
import { ClickRow } from "@/components/ui/click-row";
import { CompactList } from "@/components/ui/compact-list";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { pageParam, str } from "@/utils";
import type { Prisma } from "@prisma/client";
import { FilterBar } from "@/components/ui/filter-bar";
import { GRADE_OPTIONS, gradeOf } from "@/lib/member-sort";
import { DataTable, EmptyState, PageHeader, Pagination, Td, Th } from "@/components/ui/misc";
import { cohortLabel } from "@/lib/school-year";
import { DeleteDepartmentButton, DepartmentFormButton, SecretaryButton, SyncSchoolYearButton } from "@/components/members/department-actions";

export const metadata = { title: "Chi đoàn" };

const PAGE_SIZE = 15;

export default async function DepartmentsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireRole(["ADMIN"]);
  const isAdmin = user.role === "ADMIN";
  const sp = await searchParams;
  const page = pageParam(sp.page);
  const graduated = sp.ra_truong === "1";
  const khoi = gradeOf(str(sp.khoi)), q = str(sp.q), sort = str(sp.sort), obj = str(sp.obj) === "gv" ? "gv" : str(sp.obj) === "hs" ? "hs" : "";
  const where: Prisma.DepartmentWhereInput = isAdmin
    ? { graduatedAt: graduated ? { not: null } : null, ...(obj ? { isTeacher: obj === "gv" } : {}), ...(khoi || q ? { name: { ...(khoi ? { contains: khoi } : {}), ...(q ? { contains: q, mode: "insensitive" as const } : {}) } } : {}) }
    : { id: user.departmentId ?? "__none__" };
  const [allDepts, memberRows] = await Promise.all([
    db.department.findMany({
      where, orderBy: { name: "asc" },
      include: { secretary: { select: { id: true, fullName: true, username: true } }, _count: { select: { members: true } } },
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
  const totalDepts = sorted.length;
  const departments = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <PageHeader title={isAdmin ? "Chi đoàn" : "Chi đoàn của tôi"} description={isAdmin ? `${totalDepts} Chi đoàn ${graduated ? "đã ra trường" : "đang học"}` : undefined}
        actions={isAdmin && <><SyncSchoolYearButton /><DepartmentFormButton /></>} />
      {isAdmin && (
        <FilterBar leading={
          <div className="flex gap-1 text-sm">
            <Link href="/departments" className={`rounded-md px-3 py-2 ${!graduated ? "bg-primary text-white" : "bg-white/85 hover:bg-slate-100"}`}>Đang học</Link>
            <Link href="/departments?ra_truong=1" className={`rounded-md px-3 py-2 ${graduated ? "bg-primary text-white" : "bg-white/85 hover:bg-slate-100"}`}>Đã ra trường</Link>
          </div>
        } fields={[
          { type: "search", name: "q", placeholder: "Tìm Chi đoàn..." },
          { type: "select", name: "obj", label: "Đối tượng", options: [{ value: "hs", label: "Học sinh" }, { value: "gv", label: "Giáo viên" }] },
          { type: "select", name: "khoi", label: "Khối", options: GRADE_OPTIONS },
          { type: "select", name: "sort", label: "Sắp xếp (mặc định: tên A → Z)", options: [
            { value: "ten_z", label: "Tên Z → A" }, { value: "sl_giam", label: "Nhiều đoàn viên nhất" }, { value: "sl_tang", label: "Ít đoàn viên nhất" },
            { value: "khoa_moi", label: "Niên khóa mới nhất" }, { value: "khoa_cu", label: "Niên khóa cũ nhất" }] },
        ]} />
      )}
      {departments.length === 0 ? (
        <div className="rounded-lg border border-border bg-white/85"><EmptyState title="Chưa có Chi đoàn nào" description="Tạo Chi đoàn đầu tiên để bắt đầu thêm đoàn viên." action={isAdmin ? <DepartmentFormButton /> : undefined} /></div>
      ) : (
        <>
        <CompactList items={departments.map((d, i) => ({
          id: d.id, title: `Chi đoàn ${d.name}${d.isTeacher ? " (giáo viên)" : d.startYear ? ` (${cohortLabel(d.startYear)})` : ""}`, subtitle: d.secretary ? `Bí thư: ${d.secretary.fullName}` : graduated ? "Đã ra trường" : "Chưa phân công bí thư", value: `${d._count.members} HS`,
          href: `/departments/${d.id}`,
        }))} />
        <div className="max-sm:hidden">
        <DataTable>
          <thead><tr><Th>Chi đoàn</Th><Th>Niên khóa</Th><Th>Bí thư</Th><Th className="text-right">Đoàn viên</Th>{isAdmin && <Th />}</tr></thead>
          <tbody>
            {departments.map((d, i) => (
              <ClickRow key={d.id} href={`/departments/${d.id}`}>
                <Td><Link href={`/departments/${d.id}`} className="font-medium text-primary hover:underline">{d.name}</Link>{d.isTeacher && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-800">Giáo viên</span>}</Td>
                <Td className="whitespace-nowrap">{d.isTeacher ? "—" : cohortLabel(d.startYear) || "—"}</Td>
                <Td>{d.secretary ? d.secretary.fullName : <span className="text-muted">Chưa phân công</span>}</Td>
                <Td className="text-right tabular-nums">{d._count.members}</Td>
                {isAdmin && (
                  <Td className="text-right whitespace-nowrap">
                    <SecretaryButton departmentId={d.id} current={d.secretary} candidates={memberRows.filter((m) => m.departmentId === d.id).map((m) => ({ id: m.id, userId: m.userId, label: `${m.fullName} (${m.code})` }))} />
                    <DepartmentFormButton dept={{ id: d.id, name: d.name, description: d.description, startYear: d.startYear, isTeacher: d.isTeacher }} />
                    <DeleteDepartmentButton id={d.id} name={d.name} />
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
