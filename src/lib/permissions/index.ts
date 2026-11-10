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
export const isMonitor = (u: SessionUser) => u.role === "MONITOR";
export const isDepartmentAccount = (u: SessionUser) => u.role === "DEPARTMENT_ACCOUNT";
export const isStaff = (u: SessionUser) => u.role === "ADMIN" || u.role === "SECRETARY";

export function assertRole(user: SessionUser, ...roles: SessionUser["role"][]) {
  if (!roles.includes(user.role)) throw new ForbiddenError();
}

/** Admin: mọi chi đoàn. Bí thư / Tài khoản chi đoàn: chỉ chi đoàn của mình. Đoàn viên, cờ đỏ: không có quyền quản lý. */
export function canManageDepartment(user: SessionUser, departmentId: string | null | undefined): boolean {
  if (user.role === "ADMIN") return true;
  if (user.role === "SECRETARY" || user.role === "DEPARTMENT_ACCOUNT") return !!departmentId && user.departmentId === departmentId;
  return false;
}

/** Ai được ghi nhận vi phạm: Admin, hoặc cờ đỏ (chấm nề nếp mọi Chi đoàn, không giới hạn 1 chi đoàn). */
export function canReportViolation(user: SessionUser, _departmentId?: string | null): boolean {
  return user.role === "ADMIN" || user.role === "MONITOR";
}

export function assertReportViolation(user: SessionUser) {
  if (!canReportViolation(user)) throw new ForbiddenError();
}

/** Ai được xem danh sách vi phạm toàn trường (không giới hạn theo Chi đoàn của mình): Admin, cờ đỏ. */
export const canViewViolations = (user: SessionUser) => user.role === "ADMIN" || user.role === "MONITOR";

export function assertManageDepartment(user: SessionUser, departmentId: string | null | undefined) {
  if (!canManageDepartment(user, departmentId)) throw new ForbiddenError();
}

/** Hoạt động toàn trường (departmentId = null) chỉ Admin được quản lý. */
export const canManageActivity = (user: SessionUser, activity: { departmentId: string | null }) =>
  canManageDepartment(user, activity.departmentId);

/** Phạm vi lọc dữ liệu theo chi đoàn cho truy vấn danh sách. */
export function departmentScope(user: SessionUser): string | undefined {
  if (user.role === "ADMIN" || user.role === "MONITOR") return undefined; // cờ đỏ chấm mọi Chi đoàn, không giới hạn 1 chi đoàn
  if ((user.role === "SECRETARY" || user.role === "DEPARTMENT_ACCOUNT") && user.departmentId) return user.departmentId;
  throw new ForbiddenError();
}
