// Không import "server-only" để seed script (tsx) dùng lại được.
import type { Prisma, PrismaClient } from "@prisma/client";
import { generateTempPassword, hashPassword } from "@/lib/auth/password";

type Client = Prisma.TransactionClient | PrismaClient;

export const MEMBER_CODE_PREFIX = "SH";

/** Mã dạng SH + năm + số thứ tự 4 chữ số (SH20260001). */
export async function nextMemberCodes(client: Client, year: number, count: number): Promise<string[]> {
  const prefix = `${MEMBER_CODE_PREFIX}${year}`;
  const last = await client.member.findFirst({
    where: { code: { startsWith: prefix } },
    orderBy: { code: "desc" },
    select: { code: true },
  });
  const start = last ? parseInt(last.code.slice(prefix.length), 10) + 1 : 1;
  return Array.from({ length: count }, (_, i) => `${prefix}${String(start + i).padStart(4, "0")}`);
}

export async function findOrCreateClass(client: Client, departmentId: string, name: string) {
  const grade = parseInt(name.match(/^\d+/)?.[0] ?? "", 10);
  return client.class.upsert({
    where: { departmentId_name: { departmentId, name } },
    update: {},
    create: { departmentId, name, grade: Number.isNaN(grade) ? null : grade },
  });
}

export type NewMemberData = {
  fullName: string;
  gender?: string | null;
  dateOfBirth?: Date | null;
  joinedAt?: Date | null;
  isDoanVien?: boolean;
  cohort?: number | null;
  departmentId: string;
  classId: string;
  status?: "ACTIVE" | "TRANSFERRED" | "GRADUATED";
  avatarUrl?: string | null;
  avatarPublicId?: string | null;
};

/** Tạo Member + User (username = mã đoàn viên, mật khẩu tạm thời). */
export async function createMemberWithAccount(
  client: Client,
  data: NewMemberData,
  code: string,
  preset?: { password?: string; passwordHash?: string },
) {
  const tempPassword = preset?.password ?? generateTempPassword();
  const passwordHash = preset?.passwordHash ?? (await hashPassword(tempPassword));
  const user = await client.user.create({
    data: { username: code, passwordHash, fullName: data.fullName, role: "MEMBER", mustChangePassword: true },
  });
  const member = await client.member.create({ data: { ...data, code, userId: user.id } });
  return { user, member, tempPassword };
}

/** Bí thư là một đoàn viên giữ chức vụ: bảo đảm tài khoản bí thư (cũ) cũng có hồ sơ đoàn viên trong Chi đoàn. */
export async function ensureMemberProfile(client: Client, user: { id: string; fullName: string }, dept: { id: string; name: string }) {
  const existing = await client.member.findUnique({ where: { userId: user.id } });
  if (existing) return existing;
  const cls = await findOrCreateClass(client, dept.id, dept.name);
  const [code] = await nextMemberCodes(client, new Date().getFullYear(), 1);
  return client.member.create({ data: { code, userId: user.id, fullName: user.fullName, departmentId: dept.id, classId: cls.id } });
}
