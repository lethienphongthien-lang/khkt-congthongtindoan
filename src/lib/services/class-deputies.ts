import { db } from "@/lib/db";
import { UserError } from "@/lib/action";
import { hasEduIntegration } from "./edu-integration";

export type Deputy = { memberId: string; userId: string; fullName: string };

/** Lớp phó học tập lưu ở bảng chung edu."ClassAcademicDeputy" (EduConnect sở hữu); thiếu bảng thì tính năng tắt. */
export async function deputiesAvailable(): Promise<boolean> {
  if (!(await hasEduIntegration())) return false;
  const [r] = await db.$queryRaw<{ ready: boolean }[]>`SELECT to_regclass('edu."ClassAcademicDeputy"') IS NOT NULL AS ready`;
  return r.ready;
}

export async function listDeputies(departmentId: string): Promise<Deputy[]> {
  if (!(await deputiesAvailable())) return [];
  return db.$queryRaw<Deputy[]>`
    SELECT m.id AS "memberId", m."userId", m."fullName"
    FROM edu."ClassAcademicDeputy" d
    JOIN edu."SchoolClass" c ON c.id=d."schoolClassId" AND c."departmentId"=${departmentId}
    JOIN edu."AcademicYear" y ON y.id=c."academicYearId" AND y."schoolYear"=edu.cur_school_year()
    JOIN edu."Student" s ON s.id=d."studentId" JOIN edu."User" u ON u.id=s."userId"
    JOIN public."Member" m ON m."userId"=u."accountId"
    ORDER BY d."createdAt"`;
}

export async function setDeputy(departmentId: string, memberId: string, remove: boolean) {
  if (!(await deputiesAvailable())) throw new UserError("Chưa liên kết với EduConnect");
  const n = remove
    ? await db.$executeRaw`
        DELETE FROM edu."ClassAcademicDeputy" d USING edu."SchoolClass" c, edu."AcademicYear" y, edu."Student" s, edu."User" u, public."Member" m
        WHERE d."schoolClassId"=c.id AND c."departmentId"=${departmentId} AND y.id=c."academicYearId" AND y."schoolYear"=edu.cur_school_year()
          AND s.id=d."studentId" AND u.id=s."userId" AND m."userId"=u."accountId" AND m.id=${memberId}`
    : await db.$executeRaw`
        INSERT INTO edu."ClassAcademicDeputy"(id,"schoolClassId","studentId")
        SELECT gen_random_uuid()::text, c.id, s.id
        FROM edu."SchoolClass" c JOIN edu."AcademicYear" y ON y.id=c."academicYearId" AND y."schoolYear"=edu.cur_school_year()
        JOIN public."Member" m ON m.id=${memberId} AND m."departmentId"=${departmentId} AND m.status::text='ACTIVE'
        JOIN edu."User" u ON u."accountId"=m."userId" JOIN edu."Student" s ON s."userId"=u.id
        JOIN edu."StudentClassEnrollment" e ON e."studentId"=s.id AND e."schoolClassId"=c.id
        WHERE c."departmentId"=${departmentId}
        ON CONFLICT ("schoolClassId","studentId") DO NOTHING`;
  if (!remove && n === 0) {
    const [dup] = await db.$queryRaw<{ yes: boolean }[]>`SELECT EXISTS(SELECT 1 FROM edu."ClassAcademicDeputy" d JOIN edu."Student" s ON s.id=d."studentId" JOIN edu."User" u ON u.id=s."userId" JOIN public."Member" m ON m."userId"=u."accountId" WHERE m.id=${memberId}) AS yes`;
    if (!dup.yes) throw new UserError("Chọn học sinh đang hoạt động thuộc lớp (đã có hồ sơ EduConnect)");
  }
}
