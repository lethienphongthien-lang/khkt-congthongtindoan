"use server";

import { revalidatePath } from "next/cache";
import { invalidatePublic } from "@/lib/public-cache";
import ExcelJS from "exceljs";
import { z } from "zod";
import { db } from "@/lib/db";
import { run, UserError } from "@/lib/action";
import { audit } from "@/lib/audit";
import { requireRole, requireUser } from "@/lib/auth/session";
import { generateTempPassword, hashPassword } from "@/lib/auth/password";
import { memberSchema, memberDetailSchema, ownProfileSchema, pointAdjustSchema } from "@/lib/validation";
import { NAME_MSG, NAME_RE, cleanName, todayVN } from "@/lib/validation/rules";
import { createMemberWithAccount, findOrCreateClass, nextMemberCodes } from "@/lib/services/member-account";
import { notifyUser, notifyUsers } from "@/lib/notify";
import { deleteImage, isOwnPublicId } from "@/lib/cloudinary";

export type Credential = { code: string; fullName: string; className: string; department: string; password: string };
export type ImportResult = { created: Credential[]; errors: { row: number; message: string }[] };

/** Lớp chính là Chi đoàn: hệ thống tự gắn thành viên vào "lớp" cùng tên Chi đoàn (không còn hỏi lớp riêng). */
async function resolveClass(departmentId: string) {
  const dept = await db.department.findUnique({ where: { id: departmentId } });
  if (!dept) throw new UserError("Chi đoàn không tồn tại");
  return findOrCreateClass(db, departmentId, dept.name);
}

/** Tách phần hồ sơ chi tiết khỏi dữ liệu gửi lên (nằm trong khóa "detail"); lỗi kiểm tra được gắn tiền tố "detail." để form hiện đúng ô. */
function detailOf(input: unknown) {
  const raw = (input as { detail?: unknown } | null)?.detail;
  if (!raw) return null;
  const r = memberDetailSchema.safeParse(raw);
  if (!r.success) throw new z.ZodError(r.error.issues.map((i) => ({ ...i, path: ["detail", ...i.path] })));
  return r.data;
}
async function saveDetail(memberId: string, data: z.infer<typeof memberDetailSchema>) {
  const clean = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v === undefined ? null : v])) as Record<string, unknown>;
  await db.memberDetail.upsert({ where: { memberId }, create: { memberId, ...clean }, update: clean });
}

export async function createMemberAction(input: unknown) {
  return run<Credential>(async () => {
    const admin = await requireRole(["ADMIN"]);
    const data = memberSchema.parse(input);
    const detail = detailOf(input);
    if (!data.isDoanVien) data.joinedAt = undefined; // thanh niên chưa có ngày vào Đoàn
    if (data.avatarPublicId && !isOwnPublicId(data.avatarPublicId, "members")) throw new UserError("Ảnh không hợp lệ");
    const cls = await resolveClass(data.departmentId);
    const year = data.joinedAt?.getFullYear() ?? new Date().getFullYear();
    const result = await db.$transaction(async (tx) => {
      const [code] = await nextMemberCodes(tx, year, 1);
      return { code, ...(await createMemberWithAccount(tx, { ...data, classId: cls.id }, code)) };
    });
    if (detail) await saveDetail(result.member.id, detail);
    await audit(admin.id, "member.create", "Member", result.member.id, { code: result.code });
    revalidatePath("/members");
    return {
      data: { code: result.code, fullName: data.fullName, className: cls.name, department: "", password: result.tempPassword },
      message: data.isDoanVien ? "Đã thêm đoàn viên và tạo tài khoản" : "Đã thêm thanh niên và tạo tài khoản",
    };
  });
}

export async function updateMemberAction(id: string, input: unknown) {
  return run(async () => {
    const admin = await requireRole(["ADMIN"]);
    const data = memberSchema.parse(input);
    const detail = detailOf(input);
    const current = await db.member.findUnique({ where: { id } });
    if (!current) throw new UserError("Không tìm thấy đoàn viên");
    if (data.avatarPublicId && data.avatarPublicId !== current.avatarPublicId && !isOwnPublicId(data.avatarPublicId, "members")) {
      throw new UserError("Ảnh không hợp lệ");
    }
    const cls = await resolveClass(data.departmentId);
    await db.$transaction([
      db.member.update({ where: { id }, data: { ...data, joinedAt: data.isDoanVien ? data.joinedAt ?? null : null, avatarUrl: data.avatarUrl ?? null, avatarPublicId: data.avatarPublicId ?? null, classId: cls.id } }),
      db.user.update({ where: { id: current.userId }, data: { fullName: data.fullName } }),
    ]);
    if (current.avatarPublicId && current.avatarPublicId !== data.avatarPublicId) await deleteImage(current.avatarPublicId);
    if (detail) await saveDetail(id, detail);
    await audit(admin.id, "member.update", "Member", id, { code: current.code });
    revalidatePath("/members");
    revalidatePath(`/members/${id}`);
    return { message: "Đã cập nhật đoàn viên" };
  });
}

export async function setMemberAccountStatusAction(id: string, status: "ACTIVE" | "LOCKED") {
  return run(async () => {
    const admin = await requireRole(["ADMIN"]);
    const m = await db.member.findUnique({ where: { id } });
    if (!m) throw new UserError("Không tìm thấy đoàn viên");
    await db.user.update({ where: { id: m.userId }, data: { status } });
    await audit(admin.id, status === "LOCKED" ? "account.lock" : "account.unlock", "User", m.userId, { code: m.code });
    revalidatePath("/members");
    revalidatePath(`/members/${id}`);
    return { message: status === "LOCKED" ? "Đã khóa tài khoản" : "Đã kích hoạt tài khoản" };
  });
}

export async function resetMemberPasswordAction(id: string) {
  return run<{ password: string }>(async () => {
    const admin = await requireRole(["ADMIN"]);
    const m = await db.member.findUnique({ where: { id } });
    if (!m) throw new UserError("Không tìm thấy đoàn viên");
    const password = generateTempPassword();
    await db.$transaction([
      db.user.update({ where: { id: m.userId }, data: { passwordHash: await hashPassword(password), mustChangePassword: true } }),
      db.passkey.deleteMany({ where: { userId: m.userId } }), // cấp lại mật khẩu = thu hồi các thiết bị đăng nhập nhanh
    ]);
    await audit(admin.id, "account.reset_password", "User", m.userId, { code: m.code });
    return { data: { password }, message: "Đã cấp lại mật khẩu tạm thời" };
  });
}

/** Cấp lại mật khẩu tạm thời cho toàn bộ đoàn viên đang sinh hoạt của một Chi đoàn (lớp). Trả danh sách để Admin tải CSV, mật khẩu chỉ trả về một lần. */
export async function resetDepartmentPasswordsAction(departmentId: string) {
  return run<{ rows: Credential[] }>(async () => {
    const admin = await requireRole(["ADMIN"]);
    const dept = await db.department.findUnique({ where: { id: departmentId }, select: { id: true, name: true } });
    if (!dept) throw new UserError("Không tìm thấy Chi đoàn");
    const members = await db.member.findMany({ where: { departmentId, status: "ACTIVE", user: { status: "ACTIVE" } }, orderBy: { code: "asc" }, select: { code: true, fullName: true, userId: true } });
    if (!members.length) throw new UserError("Chi đoàn chưa có tài khoản nào để cấp lại");
    const hashed = await Promise.all(members.map(async () => { const password = generateTempPassword(); return { password, passwordHash: await hashPassword(password) }; }));
    await db.$transaction([
      ...members.map((m, i) => db.user.update({ where: { id: m.userId }, data: { passwordHash: hashed[i].passwordHash, mustChangePassword: true } })),
      db.passkey.deleteMany({ where: { userId: { in: members.map((m) => m.userId) } } }),
    ]);
    await audit(admin.id, "account.reset_password", "Department", dept.id, { department: dept.name, count: members.length });
    revalidatePath("/members");
    const rows = members.map((m, i) => ({ code: m.code, fullName: m.fullName, className: dept.name, department: dept.name, password: hashed[i].password }));
    return { data: { rows }, message: `Đã cấp lại mật khẩu cho ${rows.length} tài khoản` };
  });
}

export async function deleteMemberAction(id: string) {
  return run(async () => {
    const admin = await requireRole(["ADMIN"]);
    const m = await db.member.findUnique({ where: { id } });
    if (!m) throw new UserError("Không tìm thấy đoàn viên");
    await db.user.delete({ where: { id: m.userId } }); // cascade -> Member, Attendance, Points...
    await deleteImage(m.avatarPublicId);
    await audit(admin.id, "member.delete", "Member", id, { code: m.code, fullName: m.fullName });
    revalidatePath("/members");
    return { message: "Đã xóa đoàn viên" };
  });
}

export async function adjustPointsAction(input: unknown) {
  return run(async () => {
    const admin = await requireRole(["ADMIN"]);
    const data = pointAdjustSchema.parse(input);
    await db.$transaction(async (tx) => {
      const m = await tx.member.findUnique({ where: { id: data.memberId } });
      if (!m) throw new UserError("Không tìm thấy đoàn viên");
      if (m.totalPoints + data.points < 0) throw new UserError("Tổng điểm không thể âm");
      await tx.pointTransaction.create({ data: { memberId: m.id, type: "ADJUSTMENT", points: data.points, reason: data.reason, createdById: admin.id } });
      await tx.member.update({ where: { id: m.id }, data: { totalPoints: { increment: data.points } } });
      await notifyUser(m.userId, { type: "POINTS", title: `${data.points > 0 ? "Được cộng" : "Bị trừ"} ${Math.abs(data.points)} điểm`, body: data.reason, link: "/games" }, tx);
      await audit(admin.id, "points.adjust", "Member", m.id, { points: data.points, reason: data.reason }, tx);
    });
    revalidatePath(`/members/${data.memberId}`);
    return { message: "Đã điều chỉnh điểm" };
  });
}

/** Tự cập nhật ảnh đại diện: đoàn viên (kể cả bí thư) lưu vào hồ sơ đoàn viên (hiện cả trên thẻ số); tài khoản không có hồ sơ (Admin) lưu ở tài khoản. */
export async function updateOwnAvatarAction(input: { avatarUrl: string; avatarPublicId: string }) {
  return run(async () => {
    const user = await requireUser();
    if (!isOwnPublicId(input.avatarPublicId, "members") || !input.avatarUrl.startsWith("https://res.cloudinary.com/")) throw new UserError("Ảnh không hợp lệ");
    if (user.memberId) {
      const m = await db.member.findUniqueOrThrow({ where: { id: user.memberId } });
      await db.member.update({ where: { id: m.id }, data: { avatarUrl: input.avatarUrl, avatarPublicId: input.avatarPublicId } });
      await deleteImage(m.avatarPublicId);
    } else {
      const u = await db.user.findUniqueOrThrow({ where: { id: user.id } });
      await db.user.update({ where: { id: user.id }, data: { avatarUrl: input.avatarUrl, avatarPublicId: input.avatarPublicId } });
      await deleteImage(u.avatarPublicId);
    }
    invalidatePublic();
    return { message: "Đã cập nhật ảnh" };
  });
}

const idsSchema = z.array(z.string().min(1)).min(1, "Chọn ít nhất một người").max(1000, "Mỗi lần chọn tối đa 1000 người");

/** Kết nạp nhiều thanh niên vào Đoàn cùng lúc (bỏ qua người đã là đoàn viên). */
export async function admitMembersAction(ids: unknown, joinedAt: string) {
  return run<{ admitted: number; skipped: number }>(async () => {
    const admin = await requireRole(["ADMIN"]);
    const list = idsSchema.parse(ids);
    const when = joinedAt ? new Date(joinedAt) : new Date();
    if (Number.isNaN(when.getTime())) throw new UserError("Ngày vào Đoàn không hợp lệ");
    if (when.getTime() > Date.now() + 86_400_000) throw new UserError("Ngày vào Đoàn không thể ở tương lai");
    const targets = await db.member.findMany({ where: { id: { in: list }, isDoanVien: false }, select: { id: true, userId: true } });
    if (!targets.length) throw new UserError("Những người đã chọn đều là đoàn viên rồi");
    await db.member.updateMany({ where: { id: { in: targets.map((t) => t.id) } }, data: { isDoanVien: true, joinedAt: when } });
    await notifyUsers(targets.map((t) => t.userId), { type: "SYSTEM", title: "Chúc mừng! Bạn đã được kết nạp vào Đoàn", body: "Từ nay bạn là đoàn viên Đoàn TNCS Hồ Chí Minh.", link: "/profile" });
    await audit(admin.id, "member.admit_bulk", "Member", null, { count: targets.length });
    revalidatePath("/members"); revalidatePath("/departments"); invalidatePublic();
    return { data: { admitted: targets.length, skipped: list.length - targets.length }, message: `Đã kết nạp ${targets.length} người vào Đoàn` };
  });
}

/** Xóa nhiều tài khoản đoàn viên/thanh niên cùng lúc. Người nào không xóa được (ví dụ bí thư đã tạo hoạt động) được liệt kê lại. */
export async function deleteMembersAction(ids: unknown) {
  return run<{ deleted: number; failed: string[] }>(async () => {
    const admin = await requireRole(["ADMIN"]);
    const list = idsSchema.parse(ids);
    const members = await db.member.findMany({ where: { id: { in: list } }, select: { id: true, userId: true, code: true, fullName: true, avatarPublicId: true } });
    let deleted = 0; const failed: string[] = [];
    try {
      // cách nhanh: xóa cả lô một lượt (cascade -> hồ sơ, điểm danh, điểm...)
      await db.user.deleteMany({ where: { id: { in: members.map((m) => m.userId) } } });
      deleted = members.length;
      await Promise.all(members.map((m) => deleteImage(m.avatarPublicId)));
    } catch {
      // có người không xóa được (ví dụ bí thư đã tạo hoạt động): xóa từng người để biết chính xác ai bị vướng
      for (const m of members) {
        try { await db.user.delete({ where: { id: m.userId } }); await deleteImage(m.avatarPublicId); deleted++; } catch { failed.push(m.fullName); }
      }
    }
    await audit(admin.id, "member.delete_bulk", "Member", null, { deleted, failed: failed.length });
    revalidatePath("/members"); revalidatePath("/departments");
    if (!deleted) throw new UserError(failed.length ? `Không xóa được: ${failed.slice(0, 5).join(", ")}${failed.length > 5 ? "…" : ""}. Bí thư đã tạo hoạt động cần được chuyển cho người khác trước.` : "Không tìm thấy ai để xóa");
    return { data: { deleted, failed }, message: failed.length ? `Đã xóa ${deleted} người; ${failed.length} người không xóa được (${failed.slice(0, 3).join(", ")}${failed.length > 3 ? "…" : ""})` : `Đã xóa ${deleted} người` };
  });
}

/** Kết nạp thanh niên vào Đoàn: thành đoàn viên, ghi ngày vào Đoàn và gửi lời chúc. */
export async function admitMemberAction(id: string, joinedAt: string) {
  return run(async () => {
    const admin = await requireRole(["ADMIN"]);
    const when = joinedAt ? new Date(joinedAt) : new Date();
    if (Number.isNaN(when.getTime())) throw new UserError("Ngày vào Đoàn không hợp lệ");
    if (when.getTime() > Date.now() + 86_400_000) throw new UserError("Ngày vào Đoàn không thể ở tương lai");
    const m = await db.member.findUnique({ where: { id } });
    if (!m) throw new UserError("Không tìm thấy thành viên");
    if (m.isDoanVien) throw new UserError("Thành viên này đã là đoàn viên");
    await db.member.update({ where: { id }, data: { isDoanVien: true, joinedAt: when } });
    await notifyUser(m.userId, { type: "SYSTEM", title: "Chúc mừng! Bạn đã được kết nạp vào Đoàn", body: "Từ nay bạn là đoàn viên Đoàn TNCS Hồ Chí Minh.", link: "/profile" });
    await audit(admin.id, "member.admit", "Member", id, { code: m.code });
    revalidatePath("/members"); invalidatePublic();
    return { message: `Đã kết nạp ${m.fullName} vào Đoàn` };
  });
}

/** Đoàn viên (kể cả bí thư) tự sửa một số thông tin cá nhân. Không đổi được lớp, Chi đoàn, khóa, trạng thái, điểm (Admin quản lý). */
export async function updateOwnProfileAction(input: unknown) {
  return run(async () => {
    const user = await requireUser();
    if (!user.memberId) throw new UserError("Chỉ đoàn viên mới có hồ sơ đoàn viên");
    const data = ownProfileSchema.parse(input);
    if (data.dateOfBirth && data.dateOfBirth > new Date()) throw new UserError("Ngày sinh không thể ở tương lai");
    if (data.joinedAt && data.joinedAt > new Date()) throw new UserError("Ngày vào Đoàn không thể ở tương lai");
    const self = await db.member.findUniqueOrThrow({ where: { id: user.memberId }, select: { isDoanVien: true } });
    await db.$transaction([
      db.member.update({ where: { id: user.memberId }, data: { fullName: data.fullName, gender: data.gender ?? null, dateOfBirth: data.dateOfBirth ?? null, joinedAt: self.isDoanVien ? data.joinedAt ?? null : null } }),
      db.user.update({ where: { id: user.id }, data: { fullName: data.fullName } }),
    ]);
    await audit(user.id, "member.self_update", "Member", user.memberId, { code: user.memberCode });
    invalidatePublic();
    return { message: "Đã cập nhật thông tin" };
  });
}

// ---------- Import Excel ----------

const HEADERS = ["Họ tên", "Ngày sinh", "Giới tính", "Chi đoàn", "Lớp", "Khóa", "Ngày vào Đoàn", "Loại"] as const; // "Lớp" chỉ còn để đọc file mẫu cũ (Lớp = Chi đoàn)
const MAX_IMPORT_ROWS = 500;

function cellText(v: ExcelJS.CellValue): string {
  if (v == null) return "";
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object") {
    if ("text" in v) return String(v.text);
    if ("result" in v) return String(v.result ?? "");
    if ("richText" in v) return v.richText.map((r) => r.text).join("");
  }
  return String(v).trim();
}

function parseDate(v: ExcelJS.CellValue): Date | undefined {
  if (v == null || v === "") return undefined;
  if (v instanceof Date) return new Date(Date.UTC(v.getUTCFullYear(), v.getUTCMonth(), v.getUTCDate(), 12));
  const m = String(v).trim().match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (m) {
    const d = new Date(Date.UTC(+m[3], +m[2] - 1, +m[1], 12));
    if (d.getUTCMonth() === +m[2] - 1) return d;
  }
  const iso = new Date(String(v));
  return Number.isNaN(iso.getTime()) ? undefined : iso;
}

export async function importMembersAction(formData: FormData) {
  return run<ImportResult>(async () => {
    const admin = await requireRole(["ADMIN"]);
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) throw new UserError("Vui lòng chọn file Excel (.xlsx)");
    if (!file.name.toLowerCase().endsWith(".xlsx")) throw new UserError("Chỉ hỗ trợ file .xlsx");
    if (file.size > 4 * 1024 * 1024) throw new UserError("File tối đa 4MB");

    const wb = new ExcelJS.Workbook();
    try {
      await wb.xlsx.load(Buffer.from(await file.arrayBuffer()) as unknown as ArrayBuffer);
    } catch {
      throw new UserError("Không đọc được file Excel");
    }
    const ws = wb.worksheets[0];
    if (!ws) throw new UserError("File không có dữ liệu");

    const headerRow = ws.getRow(1);
    const col: Record<string, number> = {};
    headerRow.eachCell((cell, n) => { col[cellText(cell.value).toLowerCase()] = n; });
    if (!col["họ tên"]) throw new UserError('Thiếu cột "Họ tên". Hãy dùng file mẫu.');
    if (!col["chi đoàn"] && !col["lớp"]) throw new UserError('Thiếu cột "Chi đoàn". Hãy dùng file mẫu.');
    const get = (row: ExcelJS.Row, h: (typeof HEADERS)[number]) => (col[h.toLowerCase()] ? row.getCell(col[h.toLowerCase()]).value : null);

    const departments = await db.department.findMany();
    const deptByName = new Map(departments.map((d) => [d.name.toLowerCase(), d]));

    type Prepared = { row: number; data: Parameters<typeof createMemberWithAccount>[1]; className: string; deptName: string; joinYear: number };
    const prepared: Prepared[] = [];
    const errors: ImportResult["errors"] = [];
    const total = ws.actualRowCount - 1;
    if (total > MAX_IMPORT_ROWS) throw new UserError(`Mỗi lần nhập tối đa ${MAX_IMPORT_ROWS} đoàn viên`);

    for (let r = 2; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const fullName = cleanName(cellText(get(row, "Họ tên")));
      // Lớp chính là Chi đoàn: chỉ cần cột Chi đoàn (file mẫu cũ có cột Lớp thì dùng làm Chi đoàn)
      const deptName = cellText(get(row, "Chi đoàn")) || cellText(get(row, "Lớp"));
      if (!fullName && !deptName) continue; // dòng trống
      if (fullName.length < 2) { errors.push({ row: r, message: "Thiếu họ tên" }); continue; }
      if (!NAME_RE.test(fullName)) { errors.push({ row: r, message: `Họ tên “${fullName}” không hợp lệ. ${NAME_MSG}` }); continue; }
      if (!deptName) { errors.push({ row: r, message: "Thiếu Chi đoàn" }); continue; }
      const dept = deptByName.get(deptName.toLowerCase());
      if (!dept) { errors.push({ row: r, message: `Chi đoàn "${deptName}" chưa tồn tại` }); continue; }

      const dobRaw = get(row, "Ngày sinh");
      const dob = parseDate(dobRaw);
      if (dobRaw && !dob) { errors.push({ row: r, message: "Ngày sinh không hợp lệ (dd/mm/yyyy)" }); continue; }
      if (dob && (dob.toISOString().slice(0, 10) > todayVN() || dob.getUTCFullYear() < 1940)) { errors.push({ row: r, message: "Ngày sinh không được sau ngày hiện tại hoặc quá xa về trước" }); continue; }
      const joinedRaw = get(row, "Ngày vào Đoàn");
      const joined = parseDate(joinedRaw);
      if (joinedRaw && !joined) { errors.push({ row: r, message: "Ngày vào Đoàn không hợp lệ (dd/mm/yyyy)" }); continue; }
      if (joined && joined.toISOString().slice(0, 10) > todayVN()) { errors.push({ row: r, message: "Ngày vào Đoàn không được sau ngày hiện tại" }); continue; }
      if (dob && joined && joined <= dob) { errors.push({ row: r, message: "Ngày vào Đoàn phải sau ngày sinh" }); continue; }
      // "Loại": Đoàn viên (mặc định) hoặc Thanh niên (chưa vào Đoàn, không có ngày vào Đoàn)
      const kindText = cellText(get(row, "Loại")).toLowerCase();
      if (kindText && !/thanh|đoàn|doan/.test(kindText)) { errors.push({ row: r, message: 'Cột "Loại" phải là "Đoàn viên" hoặc "Thanh niên"' }); continue; }
      const isDoanVien = !/thanh/.test(kindText);
      const genderText = cellText(get(row, "Giới tính"));
      const gender = ["Nam", "Nữ", "Khác"].find((g) => g.toLowerCase() === genderText.toLowerCase());
      const cohortNum = parseInt(cellText(get(row, "Khóa")), 10);

      prepared.push({
        row: r, className: dept.name, deptName: dept.name, joinYear: (isDoanVien ? joined : undefined)?.getUTCFullYear() ?? new Date().getFullYear(),
        data: {
          fullName, gender: gender ?? null, dateOfBirth: dob, joinedAt: isDoanVien ? joined : null, isDoanVien,
          cohort: Number.isNaN(cohortNum) ? null : cohortNum, departmentId: dept.id, classId: "",
        },
      });
    }
    if (!prepared.length && !errors.length) throw new UserError("File không có dòng dữ liệu nào");

    // Băm mật khẩu trước, ngoài transaction, để transaction ngắn.
    const hashed = await Promise.all(prepared.map(async () => {
      const password = generateTempPassword();
      return { password, passwordHash: await hashPassword(password) };
    }));

    const created: Credential[] = [];
    if (prepared.length) {
      await db.$transaction(async (tx) => {
        const codeCounters = new Map<number, string[]>();
        for (const year of new Set(prepared.map((p) => p.joinYear))) {
          codeCounters.set(year, await nextMemberCodes(tx, year, prepared.filter((p) => p.joinYear === year).length));
        }
        for (let i = 0; i < prepared.length; i++) {
          const p = prepared[i];
          const cls = await findOrCreateClass(tx, p.data.departmentId, p.className);
          const code = codeCounters.get(p.joinYear)!.shift()!;
          await createMemberWithAccount(tx, { ...p.data, classId: cls.id }, code, hashed[i]);
          created.push({ code, fullName: p.data.fullName, className: p.className, department: p.deptName, password: hashed[i].password });
        }
        await audit(admin.id, "member.import", "Member", null, { created: created.length, errors: errors.length }, tx);
      }, { timeout: 60_000, maxWait: 10_000 });
    }
    revalidatePath("/members");
    return { data: { created, errors }, message: created.length ? `Đã nhập ${created.length} đoàn viên` : undefined };
  });
}
