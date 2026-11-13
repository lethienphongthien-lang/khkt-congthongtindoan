import "server-only";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { hasEduIntegration } from "./edu-integration";
import { gradeFor, parseClassName, schoolYearStart, startYearFor } from "@/lib/school-year";

/**
 * Chuyển năm học (idempotent, chạy lại bao nhiêu lần cũng được):
 * Khi liên kết EduConnect: EduConnect quyết định lên lớp (xem followEdu bên dưới), các bước dưới chỉ áp dụng khi chạy độc lập.
 *  - Chi đoàn có `startYear`: đổi tên khối theo năm học (10A1 -> 11A1 -> 12A1), đổi cả tên lớp trong Chi đoàn.
 *  - Quá lớp 12: đánh dấu đã ra trường, khóa tài khoản đoàn viên + bí thư (dữ liệu vẫn được giữ).
 */
export async function syncSchoolYear(actorId?: string, now: Date = new Date()) {
  const sy = schoolYearStart(now);
  const followed = await followEdu();
  if (followed) {
    const changed = followed.linked || followed.movedToDoan || followed.retired || followed.graduated;
    if (actorId && changed) await audit(actorId, "school_year.sync", "Department", null, { schoolYear: sy, source: "educonnect", ...followed });
    return { schoolYear: sy, renamed: 0, source: "educonnect" as const, ...followed };
  }
  // Chi đoàn cũ chưa có khóa: suy ra từ tên (10A1 -> vào lớp 10 năm học hiện tại).
  const legacy = await db.department.findMany({ where: { startYear: null, graduatedAt: null, isTeacher: false }, select: { id: true, name: true } });
  for (const d of legacy) {
    const p = parseClassName(d.name);
    if (p) await db.department.update({ where: { id: d.id }, data: { startYear: startYearFor(p.grade, sy) } });
  }
  const depts = await db.department.findMany({ where: { startYear: { not: null }, graduatedAt: null, isTeacher: false }, include: { classes: true } });
  let renamed = 0;
  let graduated = 0;
  for (const d of depts) {
    const grade = gradeFor(d.startYear!, sy);
    if (grade > 12) {
      await db.$transaction([
        db.department.update({ where: { id: d.id }, data: { graduatedAt: now, secretaryId: null } }),
        db.member.updateMany({ where: { departmentId: d.id }, data: { status: "GRADUATED" } }),
        db.user.updateMany({ where: { OR: [{ member: { is: { departmentId: d.id } } }, ...(d.secretaryId ? [{ id: d.secretaryId }] : [])] }, data: { status: "LOCKED" } }),
      ]);
      graduated++;
      continue;
    }
    if (grade < 10) continue; // khóa chưa vào học
    const p = parseClassName(d.name);
    if (!p || p.grade === grade) continue;
    await db.$transaction([
      db.department.update({ where: { id: d.id }, data: { name: `${grade}${p.suffix}` } }),
      ...d.classes.flatMap((c) => {
        const cp = parseClassName(c.name);
        return cp && cp.grade !== grade ? [db.class.update({ where: { id: c.id }, data: { name: `${grade}${cp.suffix}`, grade } })] : [];
      }),
    ]);
    renamed++;
  }
  await reconcileStandalone();
  if (actorId && (renamed || graduated)) await audit(actorId, "school_year.sync", "Department", null, { schoolYear: sy, renamed, graduated });
  return { schoolYear: sy, renamed, graduated, source: "standalone" as const };
}

/**
 * Đang liên kết EduConnect (đồng bộ bật + đã cài edu.sync_rollover): EduConnect quyết định lên lớp, Cổng Đoàn chỉ đi theo.
 * Chi đoàn gắn liền với lớp từng năm: lớp năm mới = chi đoàn mới, đoàn viên và ban cán sự chuyển theo xếp lớp, chi đoàn cũ được đóng.
 */
async function followEdu(): Promise<null | { linked: number; movedToDoan: number; retired: number; graduated: number; unplaced: number; syncIssues: number }> {
  if (!(await hasEduIntegration())) return null;
  // EduConnect chỉ quyết định khi nó đã tạo lớp cho năm học hiện hành; chưa có lớp nào (chỉ vận hành Cổng Đoàn) thì Cổng Đoàn tự chuyển năm.
  const [fn] = await db.$queryRaw<{ ready: boolean }[]>`SELECT to_regprocedure('edu.sync_rollover()') IS NOT NULL AND coalesce((SELECT enabled FROM edu."SyncSetting" WHERE id = 1), false)
    AND EXISTS (SELECT 1 FROM edu."SchoolClass" c JOIN edu."AcademicYear" y ON y.id = c."academicYearId" WHERE y."schoolYear" = edu.cur_school_year()) AS ready`;
  if (!fn.ready) return null;
  const [r] = await db.$queryRaw<{ linked: number; moved_to_doan: number; retired: number; graduated: number; unplaced: number; issues: bigint }[]>`SELECT * FROM edu.sync_rollover()`;
  return { linked: r.linked, movedToDoan: r.moved_to_doan, retired: r.retired, graduated: r.graduated, unplaced: r.unplaced, syncIssues: Number(r.issues) };
}

/** Chạy riêng nhưng database có EduConnect: sau khi đổi khối, để EduConnect tạo lớp năm mới và xếp lớp theo chi đoàn (edu.sync_reconcile). Lỗi ở đây không làm hỏng việc đổi khối. */
async function reconcileStandalone() {
  try {
    if (!(await hasEduIntegration())) return;
    const [fn] = await db.$queryRaw<{ ready: boolean }[]>`SELECT to_regprocedure('edu.sync_reconcile()') IS NOT NULL AS ready`;
    if (fn.ready) await db.$queryRaw`SELECT * FROM edu.sync_reconcile()`;
  } catch (e) {
    console.error("edu.sync_reconcile failed", e);
  }
}
