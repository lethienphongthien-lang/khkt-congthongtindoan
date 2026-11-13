import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
type Client = Prisma.TransactionClient | typeof db;
export type SharedTeacher = { accountId: string; fullName: string; username: string; eligible: boolean };
/** No HTTP dependency on EduConnect. Missing schema or explicit off mode simply disables linking. */
export async function hasEduIntegration(client: Client = db, ignoreSetting = false): Promise<boolean> {
  if (!ignoreSetting && process.env.EDUCONNECT_INTEGRATION === "off") return false;
  const [r] = await client.$queryRaw<{ ready: boolean }[]>`SELECT to_regclass('edu."Teacher"') IS NOT NULL AND to_regclass('edu."User"') IS NOT NULL AS ready`;
  return r.ready;
}
export async function sharedTeachers(client: Client = db): Promise<SharedTeacher[]> {
  if (!await hasEduIntegration(client)) return [];
  return client.$queryRaw<SharedTeacher[]>`
    SELECT a.id AS "accountId", t."fullName", a.username, (u."isActive" AND a.status::text='ACTIVE') AS eligible
    FROM edu."Teacher" t JOIN edu."User" u ON u.id=t."userId" JOIN public."User" a ON a.id=u."accountId"
    WHERE NOT a."superAdmin" AND a.role::text IN ('EXTERNAL','ADMIN') AND NOT ('STUDENT'::edu."Role"=ANY(u.roles)) ORDER BY t."fullName"`;
}
export async function isSharedTeacher(accountId: string, client: Client = db): Promise<boolean> {
  if (!await hasEduIntegration(client, true)) return false;
  const [r] = await client.$queryRaw<{ yes: boolean }[]>`SELECT EXISTS(
    SELECT 1 FROM edu."Teacher" t JOIN edu."User" u ON u.id=t."userId"
    WHERE u."accountId"=${accountId} AND NOT ('STUDENT'::edu."Role"=ANY(u.roles))) AS yes`;
  return r.yes;
}

/** Chi đoàn đang gắn với lớp ở EduConnect (chi đoàn chính là lớp). Không có tích hợp thì luôn false. */
export async function hasLinkedClass(departmentId: string, client: Client = db): Promise<boolean> {
  if (!await hasEduIntegration(client)) return false;
  const [r] = await client.$queryRaw<{ yes: boolean }[]>`SELECT EXISTS(SELECT 1 FROM edu."SchoolClass" WHERE "departmentId" = ${departmentId}) AS yes`;
  return r.yes;
}

/** Các đoàn viên đang là học sinh của EduConnect (đoàn viên chính là học sinh: chỉ xóa được bằng cách xóa học sinh ở EduConnect). */
export async function linkedStudentMemberIds(memberIds: string[], client: Client = db): Promise<Set<string>> {
  if (!memberIds.length || !await hasEduIntegration(client)) return new Set();
  const rows = await client.$queryRaw<{ id: string }[]>`SELECT "memberId" AS id FROM edu."Student" WHERE "memberId" = ANY(${memberIds})`;
  return new Set(rows.map((r) => r.id));
}
export const LINKED_STUDENT_HINT = "là học sinh của EduConnect. Hãy xóa học sinh ở EduConnect trước (đoàn viên sẽ bị xóa theo).";
