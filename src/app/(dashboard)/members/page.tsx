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
import { FilterBar } from "@/components/ui/filter-bar";
import { MemberTable } from "@/components/members/member-table";
import { GRADE_OPTIONS, MEMBER_SORTS, gradeOf, memberOrderBy } from "@/lib/member-sort";
import { ImportMembersButton } from "@/components/members/import-members";
import { inOrder, memberIdsByName } from "@/lib/services/member-name-sort";

export const metadata = { title: "Đoàn viên & thanh niên" };
const PAGE_SIZE = 15;

export default async function MembersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireRole(["ADMIN", "SECRETARY"]);
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
  return (
    <>
      <PageHeader
        title="Đoàn viên & thanh niên"
        description={user.role === "SECRETARY" ? `Đoàn viên và thanh niên Chi đoàn ${user.departmentName}` : undefined}
        actions={user.role === "ADMIN" && (
          <>
            <a href={`/api/members/export${exportQuery}`} className={buttonClass("secondary")}><Download className="size-4" />Xuất<span className="max-sm:hidden"> Excel</span></a>
            <ImportMembersButton />
            <Link href="/members/new" className={buttonClass()}><Plus className="size-4" />Thêm<span className="max-sm:hidden"> thành viên</span></Link>
          </>
        )}
      />
      <div className="mb-4 grid max-w-md grid-cols-3 gap-6">
        <Stat label={obj === "gv" ? "Giáo viên" : "Học sinh"} value={scopeTotal.toLocaleString("vi-VN")} />
        <Stat label="Đoàn viên" value={scopeDoanVien.toLocaleString("vi-VN")} />
        <Stat label={obj === "gv" ? "Chưa vào Đoàn" : "Thanh niên"} value={(scopeTotal - scopeDoanVien).toLocaleString("vi-VN")} />
      </div>
      <FilterBar oneRow slotId={user.role === "ADMIN" ? "member-select-slot" : undefined} fields={[
        { type: "search", name: "q", placeholder: "Tìm theo tên hoặc mã..." },
        ...(user.role === "ADMIN" ? [{ type: "select" as const, name: "obj", label: "Đối tượng", options: [{ value: "hs", label: "Học sinh" }, { value: "gv", label: "Giáo viên" }] }] : []),
        ...(user.role === "ADMIN" ? [{ type: "select" as const, name: "dept", label: "Chi đoàn", options: departments.map((d) => ({ value: d.id, label: d.name })) }] : []),
        ...(user.role === "ADMIN" ? [{ type: "select" as const, name: "khoi", label: "Khối", options: GRADE_OPTIONS }] : []),
        { type: "select", name: "kind", label: "Loại", options: [{ value: "doanvien", label: "Đoàn viên" }, { value: "thanhnien", label: "Thanh niên (chưa vào Đoàn)" }] },
        { type: "select", name: "cohort", label: "Khóa", options: cohorts.filter((c) => c.cohort).map((c) => ({ value: String(c.cohort), label: `Khóa ${c.cohort}` })) },
        { type: "select", name: "status", label: "Trạng thái", options: [
          { value: "ACTIVE", label: "Đang sinh hoạt" }, { value: "TRANSFERRED", label: "Đã chuyển sinh hoạt" },
          { value: "GRADUATED", label: "Đã ra trường" }, { value: "LOCKED", label: "Tài khoản bị khóa" }] },
        { type: "select", name: "sort", label: "Sắp xếp", options: MEMBER_SORTS },
      ]} />
      {members.length === 0 ? (
        <div className="rounded-lg border border-border bg-white/85"><EmptyState title={q || dept || cohort || status || kind || khoi ? "Không có ai khớp bộ lọc" : "Chưa có thành viên nào"} description={q || dept || cohort || status || kind || khoi ? "Thử đổi hoặc bỏ bớt bộ lọc." : user.role === "ADMIN" ? "Thêm thành viên đầu tiên, hoặc nhập cả danh sách từ Excel ở nút “Nhập” phía trên." : "Chi đoàn của bạn chưa có thành viên."}
          action={q || dept || cohort || status || kind || khoi ? <Link href="/members" className={buttonClass("secondary")}>Xóa bộ lọc</Link> : user.role === "ADMIN" ? <Link href="/members/new" className={buttonClass()}>Thêm thành viên đầu tiên</Link> : undefined} /></div>
      ) : (
        <>
        <CompactList items={members.map((m) => ({
          id: m.id, title: m.fullName, subtitle: `${m.code} · ${m.department.name}`, leading: <Avatar name={m.fullName} src={m.avatarUrl} size={28} />,
          href: `/members/${m.id}`, hrefLabel: "Xem hồ sơ",
          details: [["Mã đoàn viên", m.code], ["Chi đoàn", m.department.name], ["Ngày vào Đoàn", m.isDoanVien ? formatDate(m.joinedAt) : "Chưa vào Đoàn"]],
        }))} />
        <div className="max-sm:hidden">
        <MemberTable canManage={user.role === "ADMIN"} showDepartment allItems={allItems} rows={members.map((m) => ({
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
