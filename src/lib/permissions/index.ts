import "server-only";
import type { SessionUser } from "@/lib/auth/session";

export class ForbiddenError extends Error {
  constructor(message = "Bạn không có quyền thực hiện thao tác này") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export const isAdmin = (u: SessionUser) => u.role === "ADMIN";
export const isSecretary = (u: SessionUser) => u.role === "SECRETARY";
export const isStaff = (u: SessionUser) => u.role === "ADMIN" || u.role === "SECRETARY";

export function assertRole(user: SessionUser, ...roles: SessionUser["role"][]) {
  if (!roles.includes(user.role)) throw new ForbiddenError();
}

/** Admin: mọi chi đoàn. Bí thư: chỉ chi đoàn của mình. Đoàn viên: không có quyền quản lý. */
export function canManageDepartment(user: SessionUser, departmentId: string | null | undefined): boolean {
  if (user.role === "ADMIN") return true;
  if (user.role === "SECRETARY") return !!departmentId && user.departmentId === departmentId;
  return false;
}

export function assertManageDepartment(user: SessionUser, departmentId: string | null | undefined) {
  if (!canManageDepartment(user, departmentId)) throw new ForbiddenError();
}

/** Hoạt động toàn trường (departmentId = null) chỉ Admin được quản lý. */
export const canManageActivity = (user: SessionUser, activity: { departmentId: string | null }) =>
  canManageDepartment(user, activity.departmentId);

/** Phạm vi lọc dữ liệu theo chi đoàn cho truy vấn danh sách. */
export function departmentScope(user: SessionUser): string | undefined {
  if (user.role === "ADMIN") return undefined;
  if (user.role === "SECRETARY" && user.departmentId) return user.departmentId;
  throw new ForbiddenError();
}
