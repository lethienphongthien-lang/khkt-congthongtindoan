import "server-only";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { gradeFor, parseClassName, schoolYearStart, startYearFor } from "@/lib/school-year";

/**
 * Chuyển năm học (idempotent, chạy lại bao nhiêu lần cũng được):
 *  - Chi đoàn có `startYear`: đổi tên khối theo năm học (10A1 -> 11A1 -> 12A1), đổi cả tên lớp trong Chi đoàn.
 *  - Quá lớp 12: đánh dấu đã ra trường, khóa tài khoản đoàn viên + bí thư (dữ liệu vẫn được giữ).
 */
export async function syncSchoolYear(actorId?: string, now: Date = new Date()) {
  const sy = schoolYearStart(now);
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
  if (actorId && (renamed || graduated)) await audit(actorId, "school_year.sync", "Department", null, { schoolYear: sy, renamed, graduated });
  return { schoolYear: sy, renamed, graduated };
}
