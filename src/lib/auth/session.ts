import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { getAuthSecret } from "@/lib/env";

export const SESSION_COOKIE = "doan_session";
const SESSION_DAYS = 7;

export type SessionUser = {
  id: string;
  username: string;
  fullName: string;
  role: Role;
  /** Quản trị tối cao (chỉ vai trò ADMIN). ADMIN còn lại là Ban chấp hành Đoàn trường: đủ quyền quản lý nhưng không cấp/thu hồi tài khoản BCH. */
  superAdmin: boolean;
  position: string | null;
  mustChangePassword: boolean;
  memberId: string | null;
  memberCode: string | null;
  /** false: thanh niên (chưa vào Đoàn). Tài khoản không có hồ sơ (Admin) thì true. */
  isDoanVien: boolean;
  avatarUrl: string | null;
  /** Chi đoàn mà bí thư phụ trách, hoặc chi đoàn của đoàn viên. Admin = null. */
  departmentId: string | null;
  departmentName: string | null;
};

export async function createSession(userId: string) {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(getAuthSecret());
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 3600,
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

/** Chỉ giải mã JWT (không chạm DB) – để chạy song song các truy vấn khác với việc nạp người dùng. */
export async function getSessionUserId(): Promise<string | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    return (await jwtVerify(token, getAuthSecret())).payload.sub ?? null;
  } catch {
    return null;
  }
}

/** Đọc session và nạp lại người dùng từ DB (để khóa tài khoản có hiệu lực ngay). */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  let userId: string | undefined;
  try {
    const { payload } = await jwtVerify(token, getAuthSecret());
    userId = payload.sub;
  } catch {
    return null;
  }
  if (!userId) return null;
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      member: { select: { id: true, code: true, avatarUrl: true, isDoanVien: true, departmentId: true, department: { select: { name: true } } } },
      secretaryOf: { select: { id: true, name: true } },
    },
  });
  if (!user || user.status !== "ACTIVE") return null;
  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    superAdmin: user.role === "ADMIN" && user.superAdmin,
    position: user.position,
    mustChangePassword: user.mustChangePassword,
    memberId: user.member?.id ?? null,
    memberCode: user.member?.code ?? null,
    isDoanVien: user.member?.isDoanVien ?? true,
    avatarUrl: user.member?.avatarUrl ?? user.avatarUrl ?? null,
    departmentId: user.secretaryOf?.id ?? user.member?.departmentId ?? null,
    departmentName: user.secretaryOf?.name ?? user.member?.department.name ?? null,
  };
});

export async function requireUser(opts: { allowPasswordChange?: boolean; next?: string } = {}): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(opts.next ? `/login?next=${encodeURIComponent(opts.next)}` : "/login");
  if (user.mustChangePassword && !opts.allowPasswordChange) redirect("/change-password");
  return user;
}

export async function requireRole(roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/dashboard");
  return user;
}
