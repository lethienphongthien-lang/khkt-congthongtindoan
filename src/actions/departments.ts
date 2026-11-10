"use server";

import { revalidatePath } from "next/cache";
import { invalidatePublic } from "@/lib/public-cache";
import { db } from "@/lib/db";
import { run, UserError } from "@/lib/action";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/session";
import { generateTempPassword, hashPassword } from "@/lib/auth/password";
import { departmentSchema, secretarySchema, monitorSchema } from "@/lib/validation";
import { parseClassName, schoolYearStart, startYearFor } from "@/lib/school-year";
import { syncSchoolYear } from "@/lib/services/rollover";
import { createMemberWithAccount, findOrCreateClass, nextMemberCodes } from "@/lib/services/member-account";
import type { Credential } from "@/actions/members";
import { NAME_MSG, NAME_RE } from "@/lib/validation/rules";

/** Tách danh sách họ tên (mỗi dòng một người) và kiểm tra. */
function parseNames(text: string | undefined, label: string): string[] {
  const names = [...new Set((text ?? "").split(/\r?\n/).map((l) => l.trim().replace(/^\d+\s*[.)\-:]?\s+/, "").replace(/\s+/g, " ")).filter(Boolean))];
  if (names.some((n) => n.length < 2 || n.length > 100)) throw new UserError(`Danh sách ${label}: mỗi dòng là một họ tên (2–100 ký tự)`);
  const bad = names.find((n) => !NAME_RE.test(n));
  if (bad) throw new UserError(`Danh sách ${label}: “${bad}” không hợp lệ. ${NAME_MSG}`);
  return names;
}
/** Gộp hai danh sách thành các dòng có kèm loại; người trùng tên ở cả hai danh sách chỉ lấy một lần (ưu tiên đoàn viên). */
function mergeLists(doan: string[], youth: string[]) {
  const seen = new Set(doan.map((n) => n.toLowerCase()));
  return [...doan.map((n) => ({ name: n, isDoanVien: true })), ...youth.filter((n) => !seen.has(n.toLowerCase())).map((n) => ({ name: n, isDoanVien: false }))];
}

export async function saveDepartmentAction(id: string | null, input: unknown) {
  return run<{ created?: Credential[] }>(async () => {
    const admin = await requireRole(["ADMIN"]);
    const { startYear: given, members: memberText, youth: youthText, isTeacher: wantTeacher, ...data } = departmentSchema.parse(input);
    const current = id ? await db.department.findUnique({ where: { id }, select: { startYear: true, graduatedAt: true, isTeacher: true } }) : null;
    if (id && !current) throw new UserError("Không tìm thấy Chi đoàn");
    const isTeacher = current ? current.isTeacher : wantTeacher; // loại Chi đoàn chỉ chọn lúc tạo
    if (current?.graduatedAt) throw new UserError("Chi đoàn đã ra trường, không thể chỉnh sửa");
    // Khóa (năm vào lớp 10): nhập tay, hoặc giữ khóa cũ, hoặc suy ra từ tên khối (10A1 -> năm học hiện tại).
    const p = parseClassName(data.name);
    // Chi đoàn giáo viên không có khối/khóa
    const startYear = isTeacher ? null : given ?? current?.startYear ?? (p ? startYearFor(p.grade, schoolYearStart()) : null);
    const dup = await db.department.findFirst({ where: { name: data.name, startYear, ...(id ? { NOT: { id } } : {}) } });
    if (dup) throw new UserError("Chi đoàn này (cùng tên, cùng khóa) đã tồn tại");

    if (id) {
      const dept = await db.department.update({ where: { id }, data: { ...data, startYear } });
      await audit(admin.id, "department.update", "Department", dept.id, { name: dept.name });
      revalidatePath("/departments");
      return { message: "Đã cập nhật Chi đoàn" };
    }

    // Tạo mới: nếu có danh sách họ tên thì tự tạo lớp + đoàn viên + tài khoản (mật khẩu tạm hiển thị một lần).
    const people = mergeLists(parseNames(memberText, "đoàn viên"), parseNames(youthText, "thanh niên"));
    if (people.length > 100) throw new UserError("Mỗi lần tạo tối đa 100 người, có thể nhập thêm bằng file Excel ở mục Đoàn viên & thanh niên");
    const names = people.map((p) => p.name);
    const hashed = await Promise.all(names.map(async () => { const password = generateTempPassword(); return { password, passwordHash: await hashPassword(password) }; }));
    const created: Credential[] = [];
    const dept = await db.$transaction(async (tx) => {
      const d = await tx.department.create({ data: { ...data, startYear, isTeacher } });
      if (names.length) {
        const cls = await findOrCreateClass(tx, d.id, d.name);
        const codes = await nextMemberCodes(tx, new Date().getFullYear(), names.length);
        for (let i = 0; i < names.length; i++) {
          await createMemberWithAccount(tx, { fullName: names[i], departmentId: d.id, classId: cls.id, cohort: startYear, isDoanVien: people[i].isDoanVien }, codes[i], hashed[i]);
          created.push({ code: codes[i], fullName: names[i], className: cls.name, department: d.name, password: hashed[i].password });
        }
      }
      await audit(admin.id, "department.create", "Department", d.id, { name: d.name, members: names.length, teacher: isTeacher }, tx);
      return d;
    }, { timeout: 60_000, maxWait: 10_000 });
    revalidatePath("/departments");
    const nYouth = people.filter((p) => !p.isDoanVien).length;
    return { data: { created }, message: created.length ? `Đã tạo Chi đoàn ${dept.name} và ${created.length} tài khoản (${created.length - nYouth} đoàn viên, ${nYouth} thanh niên)` : "Đã tạo Chi đoàn" };
  });
}

export async function deleteDepartmentAction(id: string) {
  return run(async () => {
    const admin = await requireRole(["ADMIN"]);
    const dept = await db.department.findUnique({ where: { id }, include: { _count: { select: { members: true } } } });
    if (!dept) throw new UserError("Không tìm thấy Chi đoàn");
    if (dept._count.members > 0) throw new UserError("Chi đoàn còn đoàn viên, hãy chuyển đoàn viên sang Chi đoàn khác trước khi xóa");
    await db.department.delete({ where: { id } });
    await audit(admin.id, "department.delete", "Department", id, { name: dept.name });
    revalidatePath("/departments");
    return { message: "Đã xóa Chi đoàn" };
  });
}

/**
 * Phân công bí thư: chọn một đoàn viên của Chi đoàn, tài khoản đó được gán thêm vai trò bí thư
 * (vẫn là tài khoản đoàn viên, giữ quyền đoàn viên). Bí thư cũ trở lại là đoàn viên thường.
 */
export async function assignSecretaryAction(input: unknown) {
  return run(async () => {
    const admin = await requireRole(["ADMIN"]);
    const data = secretarySchema.parse(input);
    const dept = await db.department.findUnique({ where: { id: data.departmentId } });
    if (!dept || dept.graduatedAt) throw new UserError("Không tìm thấy Chi đoàn");
    const member = await db.member.findFirst({ where: { id: data.memberId, departmentId: dept.id, status: "ACTIVE" }, include: { user: true } });
    if (!member) throw new UserError("Đoàn viên này không thuộc Chi đoàn hoặc không còn sinh hoạt");
    if (member.user.status !== "ACTIVE") throw new UserError("Tài khoản của đoàn viên này đang bị khóa");
    if (member.user.role === "ADMIN") throw new UserError("Không thể gán bí thư cho tài khoản quản trị");
    if (!member.isDoanVien) throw new UserError("Chỉ đoàn viên mới được bầu làm bí thư. Hãy kết nạp thanh niên này vào Đoàn trước");
    await db.$transaction([
      ...(dept.secretaryId && dept.secretaryId !== member.userId ? [db.user.updateMany({ where: { id: dept.secretaryId, member: { isNot: null } }, data: { role: "MEMBER" } })] : []),
      db.user.update({ where: { id: member.userId }, data: { role: "SECRETARY" } }),
      db.department.update({ where: { id: dept.id }, data: { secretaryId: member.userId } }),
    ]);
    await audit(admin.id, "department.assign_secretary", "Department", dept.id, { secretaryId: member.userId, memberId: member.id });
    revalidatePath("/departments");
    return { message: `${member.fullName} đã được bầu làm bí thư` };
  });
}

export async function removeSecretaryAction(departmentId: string) {
  return run(async () => {
    const admin = await requireRole(["ADMIN"]);
    const dept = await db.department.findUnique({ where: { id: departmentId } });
    if (!dept) throw new UserError("Không tìm thấy Chi đoàn");
    await db.$transaction([
      ...(dept.secretaryId ? [db.user.updateMany({ where: { id: dept.secretaryId, member: { isNot: null } }, data: { role: "MEMBER" } })] : []),
      db.department.update({ where: { id: departmentId }, data: { secretaryId: null } }),
    ]);
    await audit(admin.id, "department.remove_secretary", "Department", departmentId);
    revalidatePath("/departments");
    return { message: "Đã gỡ chức bí thư (vẫn là đoàn viên)" };
  });
}

/**
 * Phân công cờ đỏ: chọn một đoàn viên của Chi đoàn, tài khoản đó được gán thêm vai trò cờ đỏ
 * (vẫn là tài khoản đoàn viên). Một Chi đoàn có thể có nhiều cờ đỏ cùng lúc.
 */
export async function assignMonitorAction(input: unknown) {
  return run(async () => {
    const admin = await requireRole(["ADMIN"]);
    const data = monitorSchema.parse(input);
    const dept = await db.department.findUnique({ where: { id: data.departmentId } });
    if (!dept || dept.graduatedAt) throw new UserError("Không tìm thấy Chi đoàn");
    const member = await db.member.findFirst({ where: { id: data.memberId, departmentId: dept.id, status: "ACTIVE" }, include: { user: true } });
    if (!member) throw new UserError("Đoàn viên này không thuộc Chi đoàn hoặc không còn sinh hoạt");
    if (member.user.status !== "ACTIVE") throw new UserError("Tài khoản của đoàn viên này đang bị khóa");
    if (member.user.role === "ADMIN" || member.user.role === "SECRETARY") throw new UserError("Không thể gán cờ đỏ cho tài khoản này");
    const already = await db.departmentMonitor.findUnique({ where: { userId: member.userId } });
    if (already) throw new UserError("Đoàn viên này đã là cờ đỏ");
    await db.$transaction([
      db.user.update({ where: { id: member.userId }, data: { role: "MONITOR" } }),
      db.departmentMonitor.create({ data: { userId: member.userId, departmentId: dept.id } }),
    ]);
    await audit(admin.id, "department.assign_monitor", "Department", dept.id, { memberId: member.id });
    revalidatePath(`/departments/${dept.id}`);
    return { message: `${member.fullName} đã được phân công làm cờ đỏ` };
  });
}

export async function removeMonitorAction(departmentId: string, userId: string) {
  return run(async () => {
    const admin = await requireRole(["ADMIN"]);
    const monitor = await db.departmentMonitor.findUnique({ where: { userId } });
    if (!monitor || monitor.departmentId !== departmentId) throw new UserError("Không tìm thấy cờ đỏ này trong Chi đoàn");
    await db.$transaction([
      db.user.updateMany({ where: { id: userId, member: { isNot: null } }, data: { role: "MEMBER" } }),
      db.departmentMonitor.delete({ where: { userId } }),
    ]);
    await audit(admin.id, "department.remove_monitor", "Department", departmentId, { userId });
    revalidatePath(`/departments/${departmentId}`);
    return { message: "Đã gỡ chức cờ đỏ (vẫn là đoàn viên)" };
  });
}

/**
 * Cấp tài khoản chi đoàn (dùng chung cho cả chi đoàn, Admin cấp đầu năm học): tạo tài khoản mới
 * với role DEPARTMENT_ACCOUNT, trả mật khẩu tạm hiển thị một lần. Mỗi Chi đoàn chỉ có một tài khoản.
 */
export async function createDepartmentAccountAction(departmentId: string) {
  return run<{ username: string; password: string }>(async () => {
    const admin = await requireRole(["ADMIN"]);
    const dept = await db.department.findUnique({ where: { id: departmentId } });
    if (!dept || dept.graduatedAt) throw new UserError("Không tìm thấy Chi đoàn đang học");
    if (dept.accountId) throw new UserError("Chi đoàn này đã có tài khoản");
    const base = dept.name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9]/g, "");
    let username = `chidoan.${base}`;
    for (let i = 0; await db.user.findUnique({ where: { username } }); i++) username = `chidoan.${base}${i + 2}`;
    const password = generateTempPassword();
    const passwordHash = await hashPassword(password);
    await db.$transaction(async (tx) => {
      const user = await tx.user.create({ data: { username, passwordHash, fullName: `Tài khoản Chi đoàn ${dept.name}`, role: "DEPARTMENT_ACCOUNT", mustChangePassword: true } });
      await tx.department.update({ where: { id: dept.id }, data: { accountId: user.id } });
    });
    await audit(admin.id, "department.create_account", "Department", dept.id, { username });
    revalidatePath(`/departments/${dept.id}`);
    return { data: { username, password }, message: `Đã cấp tài khoản ${username} cho Chi đoàn ${dept.name}` };
  });
}

export async function resetDepartmentAccountPasswordAction(departmentId: string) {
  return run<{ username: string; password: string }>(async () => {
    const admin = await requireRole(["ADMIN"]);
    const dept = await db.department.findUnique({ where: { id: departmentId }, include: { account: true } });
    if (!dept?.account) throw new UserError("Chi đoàn chưa có tài khoản");
    const password = generateTempPassword();
    const passwordHash = await hashPassword(password);
    await db.user.update({ where: { id: dept.account.id }, data: { passwordHash, mustChangePassword: true, status: "ACTIVE" } });
    await audit(admin.id, "department.reset_account_password", "Department", dept.id, { username: dept.account.username });
    revalidatePath(`/departments/${dept.id}`);
    return { data: { username: dept.account.username, password }, message: "Đã cấp lại mật khẩu" };
  });
}

/** Chuyển năm học thủ công (cron cũng tự chạy mỗi ngày): đổi tên khối, cho khóa lớp 12 ra trường. */
export async function syncSchoolYearAction() {
  return run(async () => {
    const admin = await requireRole(["ADMIN"]);
    const r = await syncSchoolYear(admin.id);
    invalidatePublic();
    return { message: r.renamed || r.graduated ? `Năm học ${r.schoolYear}–${r.schoolYear + 1}: đổi tên ${r.renamed} Chi đoàn, ${r.graduated} Chi đoàn ra trường` : `Năm học ${r.schoolYear}–${r.schoolYear + 1}: không có thay đổi` };
  });
}

/** Thêm nhiều đoàn viên vào một Chi đoàn đang học bằng danh sách họ tên (mỗi dòng một người): tự tạo hồ sơ + tài khoản, trả mật khẩu tạm một lần. */
export async function addMembersToDepartmentAction(departmentId: string, namesText: string, youthText = "") {
  return run<{ created: Credential[] }>(async () => {
    const admin = await requireRole(["ADMIN"]);
    const dept = await db.department.findUnique({ where: { id: departmentId } });
    if (!dept || dept.graduatedAt) throw new UserError("Không tìm thấy Chi đoàn đang học");
    const people = mergeLists(parseNames(namesText, "đoàn viên"), parseNames(youthText, "thanh niên"));
    if (!people.length) throw new UserError("Nhập ít nhất một họ tên");
    if (people.length > 100) throw new UserError("Mỗi lần thêm tối đa 100 người, có thể nhập thêm bằng file Excel");
    const names = people.map((p) => p.name);
    const hashed = await Promise.all(names.map(async () => { const password = generateTempPassword(); return { password, passwordHash: await hashPassword(password) }; }));
    const created: Credential[] = [];
    await db.$transaction(async (tx) => {
      const cls = await findOrCreateClass(tx, dept.id, dept.name);
      const codes = await nextMemberCodes(tx, new Date().getFullYear(), names.length);
      for (let i = 0; i < names.length; i++) {
        await createMemberWithAccount(tx, { fullName: names[i], departmentId: dept.id, classId: cls.id, cohort: dept.startYear, isDoanVien: people[i].isDoanVien }, codes[i], hashed[i]);
        created.push({ code: codes[i], fullName: names[i], className: cls.name, department: dept.name, password: hashed[i].password });
      }
      await audit(admin.id, "member.bulk_add", "Department", dept.id, { count: names.length }, tx);
    }, { timeout: 60_000, maxWait: 10_000 });
    revalidatePath(`/departments/${dept.id}`); revalidatePath("/members");
    const nYouth = people.filter((p) => !p.isDoanVien).length;
    return { data: { created }, message: `Đã thêm ${created.length} người vào Chi đoàn ${dept.name} (${created.length - nYouth} đoàn viên, ${nYouth} thanh niên)` };
  });
}
