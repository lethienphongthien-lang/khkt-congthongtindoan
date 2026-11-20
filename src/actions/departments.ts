"use server";
import { assertEduWrite } from "@/lib/services/edu-policy";
import { hasLinkedClass } from "@/lib/services/edu-integration";
import { setDeputy } from "@/lib/services/class-deputies";
import { assignClassOfficer } from "@/lib/services/class-officers";
import { z } from "zod";

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
import { getT } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n/translate";
const tr = async (key: MessageKey, p?: Record<string, string | number>) => (await getT())(key, p);

/** Tách danh sách họ tên (mỗi dòng một người) và kiểm tra. */
async function parseNames(text: string | undefined, label: string): Promise<string[]> {
  const names = [...new Set((text ?? "").split(/\r?\n/).map((l) => l.trim().replace(/^\d+\s*[.)\-:]?\s+/, "").replace(/\s+/g, " ")).filter(Boolean))];
  if (names.some((n) => n.length < 2 || n.length > 100)) throw new UserError(await tr("act.d.namesLen", { label: label }));
  const bad = names.find((n) => !NAME_RE.test(n));
  if (bad) throw new UserError(`${await tr("act.d.namesBad", { label: label, bad: bad })} ${NAME_MSG}`);
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
    if (id && !current) throw new UserError(await tr("act.d.notFound"));
    const isTeacher = current ? current.isTeacher : wantTeacher; // loại Chi đoàn chỉ chọn lúc tạo
    if (!isTeacher) await assertEduWrite("classes"); // chi đoàn học sinh chính là lớp của EduConnect
    if (current?.graduatedAt) throw new UserError(await tr("act.d.graduatedLocked"));
    // Khóa (năm vào lớp 10): nhập tay, hoặc giữ khóa cũ, hoặc suy ra từ tên khối (10A1 -> năm học hiện tại).
    const p = parseClassName(data.name);
    // Chi đoàn giáo viên không có khối/khóa
    const startYear = isTeacher ? null : given ?? current?.startYear ?? (p ? startYearFor(p.grade, schoolYearStart()) : null);
    const dup = await db.department.findFirst({ where: { name: data.name, startYear, ...(id ? { NOT: { id } } : {}) } });
    if (dup?.deletedAt) throw new UserError(await tr("act.d.dupDeleted"));
    if (dup) throw new UserError(await tr("act.d.dup"));

    if (id) {
      const dept = await db.department.update({ where: { id }, data: { ...data, startYear } });
      await audit(admin.id, "department.update", "Department", dept.id, { name: dept.name });
      revalidatePath("/departments");
      return { message: await tr("act.d.updated") };
    }

    // Tạo mới: nếu có danh sách họ tên thì tự tạo lớp + đoàn viên + tài khoản (mật khẩu tạm hiển thị một lần).
    const people = mergeLists(await parseNames(memberText, await tr("act.d.lblMembers")), await parseNames(youthText, await tr("act.d.lblYouth")));
    if (people.length > 100) throw new UserError(await tr("act.d.max100create"));
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
    return { data: { created }, message: created.length ? await tr("act.d.createdWith", { name: dept.name, n: created.length, m: created.length - nYouth, y: nYouth }) : await tr("act.d.created") };
  });
}

export async function deleteDepartmentAction(id: string) {
  return run(async () => {
    const admin = await requireRole(["ADMIN"]);
    if (!(await db.department.findUnique({ where: { id }, select: { isTeacher: true } }))?.isTeacher) await assertEduWrite("classes");
    const dept = await db.department.findUnique({ where: { id }, include: { _count: { select: { members: { where: { deletedAt: null } } } } } });
    if (!dept) throw new UserError(await tr("act.d.notFound"));
    if (dept._count.members > 0) throw new UserError(await tr("act.d.hasMembers"));
    // Chi đoàn gắn liền với lớp: chi đoàn chỉ bị xóa (mềm) khi xóa lớp ở EduConnect.
    if (await hasLinkedClass(id)) throw new UserError(await tr("act.d.linkedClass", { name: dept.name }));
    await db.department.delete({ where: { id } });
    await audit(admin.id, "department.delete", "Department", id, { name: dept.name });
    revalidatePath("/departments");
    return { message: await tr("act.d.deleted") };
  });
}

/**
 * Phân công bí thư: chọn một đoàn viên của Chi đoàn, tài khoản đó được gán thêm vai trò bí thư
 * (vẫn là tài khoản đoàn viên, giữ quyền đoàn viên). Bí thư cũ trở lại là đoàn viên thường.
 */
// Shared offices: execute one transactional command for both application entry points.
export async function assignSecretaryAction(input: unknown) {
  return run(async () => {
    const admin = await requireRole(["ADMIN"]);
    const d = secretarySchema.parse(input);
    await assignClassOfficer(admin.id, d.departmentId, "SECRETARY", d.memberId);
    revalidatePath("/departments"); revalidatePath(`/departments/${d.departmentId}`);
    return { message: await tr("act.d.secAssigned") };
  });
}
export async function removeSecretaryAction(departmentId: string) {
  return run(async () => {
    const admin = await requireRole(["ADMIN"]);
    await assignClassOfficer(admin.id, departmentId, "SECRETARY", null, true);
    revalidatePath("/departments"); revalidatePath(`/departments/${departmentId}`);
    return { message: await tr("act.d.secRemoved") };
  });
}
export async function assignMonitorAction(input: unknown) {
  return run(async () => {
    const admin = await requireRole(["ADMIN"]);
    const d = monitorSchema.parse(input);
    await assignClassOfficer(admin.id, d.departmentId, "RED_MONITOR", d.memberId);
    revalidatePath(`/departments/${d.departmentId}`);
    return { message: await tr("act.d.rfAssigned") };
  });
}
export async function removeMonitorAction(departmentId: string, userId: string) {
  return run(async () => {
    const admin = await requireRole(["ADMIN"]);
    const member = await db.member.findUnique({ where: { userId }, select: { id: true } });
    if (!member) throw new UserError(await tr("act.d.studentNotFound"));
    await assignClassOfficer(admin.id, departmentId, "RED_MONITOR", member.id, true);
    revalidatePath(`/departments/${departmentId}`);
    return { message: await tr("act.d.rfRemoved") };
  });
}
export async function setDeputyAction(departmentId: string, memberId: string, remove = false) {
  return run(async () => {
    const admin = await requireRole(["ADMIN"]);
    await setDeputy(departmentId, memberId, remove);
    await db.auditLog.create({ data: { userId: admin.id, action: `department.DEPUTY.${remove ? "remove" : "assign"}`, target: "Department", targetId: departmentId, metadata: { memberId } } });
    revalidatePath(`/departments/${departmentId}`);
    return { message: remove ? await tr("act.d.depRemoved") : await tr("act.d.depAdded") };
  });
}
export async function setClassPresidentAction(input: unknown) {
  return run(async () => {
    const admin = await requireRole(["ADMIN"]);
    const d = z.object({ departmentId: z.string().min(1), memberId: z.string().nullable() }).parse(input);
    await assignClassOfficer(admin.id, d.departmentId, "PRESIDENT", d.memberId, d.memberId === null);
    revalidatePath(`/departments/${d.departmentId}`);
    return { message: await tr("act.d.presUpdated") };
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
    if (!dept || dept.graduatedAt) throw new UserError(await tr("act.d.activeNotFound"));
    if (dept.accountId) throw new UserError(await tr("act.d.hasAccount"));
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
    return { data: { username, password }, message: await tr("act.d.accountIssued", { u: username, name: dept.name }) };
  });
}

export async function resetDepartmentAccountPasswordAction(departmentId: string) {
  return run<{ username: string; password: string }>(async () => {
    const admin = await requireRole(["ADMIN"]);
    const dept = await db.department.findUnique({ where: { id: departmentId }, include: { account: true } });
    if (!dept?.account) throw new UserError(await tr("act.d.noAccount"));
    const password = generateTempPassword();
    const passwordHash = await hashPassword(password);
    await db.user.update({ where: { id: dept.account.id }, data: { passwordHash, mustChangePassword: true, status: "ACTIVE" } });
    await audit(admin.id, "department.reset_account_password", "Department", dept.id, { username: dept.account.username });
    revalidatePath(`/departments/${dept.id}`);
    return { data: { username: dept.account.username, password }, message: await tr("act.d.pwReissued") };
  });
}

/** Chuyển năm học: chỉ chạy khi admin bấm (không có cron). Theo EduConnect nếu đã có lớp năm mới, nếu không thì đổi tên khối và cho khóa lớp 12 ra trường. */
export async function syncSchoolYearAction() {
  return run(async () => {
    const admin = await requireRole(["ADMIN"]);
    await assertEduWrite("placement");
    const r = await syncSchoolYear(admin.id);
    invalidatePublic();
    if (r.source === "educonnect") return { message: r.linked || r.movedToDoan || r.retired || r.graduated ? await tr("act.d.syncEdu", { y1: r.schoolYear, y2: r.schoolYear + 1, a: r.linked, b: r.movedToDoan, c: r.retired, d: r.graduated }) + (r.unplaced ? ", " + await tr("act.d.unplaced", { n: r.unplaced }) : "") : await tr("act.d.syncSame", { y1: r.schoolYear, y2: r.schoolYear + 1 }) };
    return { message: r.renamed || r.graduated ? await tr("act.d.syncRenamed", { y1: r.schoolYear, y2: r.schoolYear + 1, a: r.renamed, b: r.graduated }) : await tr("act.d.syncNone", { y1: r.schoolYear, y2: r.schoolYear + 1 }) };
  });
}

/** Thêm nhiều đoàn viên vào một Chi đoàn đang học bằng danh sách họ tên (mỗi dòng một người): tự tạo hồ sơ + tài khoản, trả mật khẩu tạm một lần. */
export async function addMembersToDepartmentAction(departmentId: string, namesText: string, youthText = "") {
  return run<{ created: Credential[] }>(async () => {
    await assertEduWrite("profiles", "placement");
    const admin = await requireRole(["ADMIN"]);
    const dept = await db.department.findUnique({ where: { id: departmentId } });
    if (!dept || dept.graduatedAt) throw new UserError(await tr("act.d.activeNotFound"));
    const people = mergeLists(await parseNames(namesText, await tr("act.d.lblMembers")), await parseNames(youthText, await tr("act.d.lblYouth")));
    if (!people.length) throw new UserError(await tr("act.d.atLeastOne"));
    if (people.length > 100) throw new UserError(await tr("act.d.max100add"));
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
    return { data: { created }, message: await tr("act.d.addedN", { n: created.length, name: dept.name, m: created.length - nYouth, y: nYouth }) };
  });
}
