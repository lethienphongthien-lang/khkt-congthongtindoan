"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { run, UserError } from "@/lib/action";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/session";
import { ForbiddenError } from "@/lib/permissions";
import { volunteerSchema } from "@/lib/validation";
import { notifyUsers } from "@/lib/notify";
import { invalidatePublic } from "@/lib/public-cache";
import { fromLocalInput, formatDate } from "@/utils";
import { getT } from "@/lib/i18n/server";
import type { TFn } from "@/lib/i18n/translate";

const refresh = () => { revalidatePath("/volunteer"); revalidatePath("/approvals"); revalidatePath("/dashboard"); revalidatePath("/tinh-nguyen"); invalidatePublic(); };

/** Duyệt một đăng ký tình nguyện: hiện lên lịch tình nguyện, báo cho các đoàn viên của Chi đoàn và bí thư. Không có điểm danh. */
async function approveRequest(requestId: string, reviewerId: string, t: TFn) {
  const req = await db.volunteerRequest.findUnique({ where: { id: requestId }, include: { department: { select: { name: true, graduatedAt: true } } } });
  if (!req) throw new UserError(t("community.sa.volMissing"));
  if (req.status !== "PENDING") throw new UserError(t("community.sa.volHandled"));
  if (req.department.graduatedAt) throw new UserError(t("community.sa.volGraduated"));
  const members = await db.member.findMany({ where: { departmentId: req.departmentId, status: "ACTIVE", user: { status: "ACTIVE" } }, select: { userId: true } });
  await db.volunteerRequest.update({ where: { id: req.id }, data: { status: "APPROVED", reviewedById: reviewerId, reviewedAt: new Date() } });
  await audit(reviewerId, "volunteer.approve", "Department", req.departmentId, { task: req.task, department: req.department.name });
  const when = `${formatDate(req.startAt)} · ${req.location}`;
  await notifyUsers(members.map((m) => m.userId).filter((id) => id !== req.requestedById), { type: "SYSTEM", title: "Chi đoàn đăng ký tình nguyện", body: `${req.task} · ${when}`, link: "/tinh-nguyen" });
  if (req.requestedById !== reviewerId) await notifyUsers([req.requestedById], { type: "SYSTEM", title: "Đăng ký tình nguyện đã được duyệt", body: `${req.task} · ${when}`, link: "/volunteer" });
  return { department: req.department.name, members: members.length };
}

/** Bí thư đăng ký tình nguyện cho cả Chi đoàn (chờ Admin duyệt); Admin đăng ký thay thì được duyệt luôn. */
export async function registerVolunteerAction(input: unknown) {
  return run<{ id: string }>(async () => {
    const t = await getT();
    const user = await requireRole(["ADMIN", "SECRETARY", "DEPARTMENT_ACCOUNT"]);
    const d = volunteerSchema.parse(input);
    const departmentId = user.role !== "ADMIN" ? user.departmentId : d.departmentId;
    if (!departmentId) { if (user.role !== "ADMIN") throw new ForbiddenError(); throw new UserError(t("community.sa.volPickChapter")); }
    const dept = await db.department.findUnique({ where: { id: departmentId }, select: { id: true, name: true, graduatedAt: true } });
    if (!dept || dept.graduatedAt) throw new UserError(t("community.sa.volChapterGone"));
    const startAt = fromLocalInput(`${d.date}T${d.startTime}`), endAt = fromLocalInput(`${d.date}T${d.endTime}`);
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) throw new UserError(t("community.sa.volBadDate"));
    if (endAt <= startAt) throw new UserError(t("community.sa.volEndAfter"));

    const req = await db.volunteerRequest.create({ data: { departmentId, task: d.task, startAt, endAt, location: d.location, hours: d.hours, points: d.points, note: d.note ?? null, requestedById: user.id } });
    await audit(user.id, "volunteer.request", "Department", departmentId, { task: d.task, department: dept.name });
    if (user.role === "ADMIN") {
      const r = await approveRequest(req.id, user.id, t);
      refresh();
      return { data: { id: req.id }, message: t("community.sa.volRegistered", { name: r.department }) };
    }
    const admins = await db.user.findMany({ where: { role: "ADMIN", status: "ACTIVE" }, select: { id: true } });
    await notifyUsers(admins.map((a) => a.id), { type: "SYSTEM", title: "Đăng ký tình nguyện chờ duyệt", body: `Chi đoàn ${dept.name}: ${d.task} · ${formatDate(startAt)}`, link: "/approvals" });
    refresh();
    return { data: { id: req.id }, message: t("community.sa.volQueued") };
  });
}

/** Sửa đăng ký tình nguyện đang chờ duyệt hoặc đã duyệt (chưa hoàn thành). Bí thư chỉ sửa được của Chi đoàn mình; sửa buổi đã duyệt thì báo lại cho đoàn viên. */
export async function updateVolunteerAction(requestId: string, input: unknown) {
  return run<{ id: string }>(async () => {
    const t = await getT();
    const user = await requireRole(["ADMIN", "SECRETARY", "DEPARTMENT_ACCOUNT"]);
    const d = volunteerSchema.parse(input);
    const req = await db.volunteerRequest.findUnique({ where: { id: requestId }, include: { department: { select: { name: true } } } });
    if (!req) throw new UserError(t("community.sa.volMissing"));
    if (user.role !== "ADMIN" && req.departmentId !== user.departmentId) throw new ForbiddenError();
    if (req.status !== "PENDING" && req.status !== "APPROVED") throw new UserError(t("community.sa.volEditOnly"));
    const startAt = fromLocalInput(`${d.date}T${d.startTime}`), endAt = fromLocalInput(`${d.date}T${d.endTime}`);
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) throw new UserError(t("community.sa.volBadDate"));
    if (endAt <= startAt) throw new UserError(t("community.sa.volEndAfter"));
    const upd = await db.volunteerRequest.updateMany({ where: { id: requestId, status: req.status }, data: { task: d.task, startAt, endAt, location: d.location, hours: d.hours, points: d.points, note: d.note ?? null } });
    if (!upd.count) throw new UserError(t("community.sa.volJustHandled"));
    await audit(user.id, "volunteer.update", "Department", req.departmentId, { task: d.task, department: req.department.name });
    if (req.status === "APPROVED") {
      const members = await db.member.findMany({ where: { departmentId: req.departmentId, status: "ACTIVE", user: { status: "ACTIVE" } }, select: { userId: true } });
      await notifyUsers(members.map((m) => m.userId).filter((id) => id !== user.id), { type: "SYSTEM", title: "Buổi tình nguyện được cập nhật", body: `${d.task} · ${formatDate(startAt)} · ${d.location}`, link: "/tinh-nguyen" });
    }
    refresh();
    return { data: { id: requestId }, message: t("community.sa.volUpdated") };
  });
}

/** Admin duyệt đăng ký tình nguyện. */
export async function approveVolunteerAction(requestId: string) {
  return run(async () => {
    const t = await getT();
    const admin = await requireRole(["ADMIN"]);
    const r = await approveRequest(requestId, admin.id, t);
    refresh();
    return { message: t("community.sa.volApproved", { name: r.department }) };
  });
}

/** Admin từ chối đăng ký tình nguyện (kèm lý do, bí thư sẽ nhận thông báo). */
export async function rejectVolunteerAction(requestId: string, reason: string) {
  return run(async () => {
    const t = await getT();
    const admin = await requireRole(["ADMIN"]);
    const why = z.string().trim().max(300).parse(reason ?? "");
    const req = await db.volunteerRequest.findUnique({ where: { id: requestId }, include: { department: { select: { name: true } } } });
    if (!req) throw new UserError(t("community.sa.volMissing"));
    if (req.status !== "PENDING") throw new UserError(t("community.sa.volHandled"));
    await db.volunteerRequest.update({ where: { id: requestId }, data: { status: "REJECTED", reviewedById: admin.id, reviewedAt: new Date(), rejectReason: why || null } });
    await audit(admin.id, "volunteer.reject", "Department", req.departmentId, { task: req.task, reason: why });
    await notifyUsers([req.requestedById], { type: "SYSTEM", title: "Đăng ký tình nguyện bị từ chối", body: `${req.task} · ${formatDate(req.startAt)}${why ? `. Lý do: ${why}` : ""}`, link: "/volunteer" });
    refresh();
    return { message: t("community.sa.volRejected") };
  });
}

/** Rút đăng ký đang chờ duyệt hoặc hủy buổi đã duyệt nhưng chưa hoàn thành (bí thư của Chi đoàn đó, hoặc Admin). */
export async function cancelVolunteerRequestAction(requestId: string) {
  return run(async () => {
    const t = await getT();
    const user = await requireRole(["ADMIN", "SECRETARY", "DEPARTMENT_ACCOUNT"]);
    const req = await db.volunteerRequest.findUnique({ where: { id: requestId } });
    if (!req) throw new UserError(t("community.sa.volMissing"));
    if (user.role !== "ADMIN" && req.departmentId !== user.departmentId) throw new ForbiddenError();
    if (req.status !== "PENDING" && req.status !== "APPROVED") throw new UserError(t("community.sa.volWithdrawOnly"));
    await db.volunteerRequest.delete({ where: { id: requestId } });
    await audit(user.id, "volunteer.cancel_request", "Department", req.departmentId, { task: req.task });
    refresh();
    return { message: t("community.sa.volWithdrawn") };
  });
}

/**
 * Bí thư bấm "Hoàn thành" sau buổi tình nguyện: tự động cộng điểm cho tất cả đoàn viên đang sinh hoạt của Chi đoàn.
 * Chỉ làm được một lần (buổi đã được duyệt và đã đến giờ bắt đầu); Admin cũng có thể xác nhận thay.
 */
export async function completeVolunteerAction(requestId: string) {
  return run<{ members: number; points: number }>(async () => {
    const t = await getT();
    const user = await requireRole(["ADMIN", "SECRETARY", "DEPARTMENT_ACCOUNT"]);
    const req = await db.volunteerRequest.findUnique({ where: { id: requestId } });
    if (!req) throw new UserError(t("community.sa.volMissing"));
    if (user.role !== "ADMIN" && req.departmentId !== user.departmentId) throw new ForbiddenError();
    if (req.status === "COMPLETED") throw new UserError(t("community.sa.volAlreadyDone"));
    if (req.status !== "APPROVED") throw new UserError(t("community.sa.volCompleteOnly"));
    if (req.startAt > new Date()) throw new UserError(t("community.sa.volNotStarted"));
    const members = await db.member.findMany({ where: { departmentId: req.departmentId, status: "ACTIVE", user: { status: "ACTIVE" } }, select: { id: true, userId: true } });
    const done = await db.$transaction(async (tx) => {
      // Giành quyền hoàn thành trước để bấm hai lần không cộng điểm hai lần
      const claimed = await tx.volunteerRequest.updateMany({ where: { id: requestId, status: "APPROVED" }, data: { status: "COMPLETED", completedAt: new Date() } });
      if (!claimed.count) return false;
      if (req.points > 0 && members.length) {
        await tx.pointTransaction.createMany({ data: members.map((m) => ({ memberId: m.id, type: "ACTIVITY" as const, points: req.points, reason: `Tình nguyện: ${req.task}`, createdById: user.id })) });
        await tx.member.updateMany({ where: { id: { in: members.map((m) => m.id) } }, data: { totalPoints: { increment: req.points } } });
      }
      await audit(user.id, "volunteer.complete", "Department", req.departmentId, { task: req.task, members: members.length, points: req.points }, tx);
      return true;
    });
    if (!done) throw new UserError(t("community.sa.volAlreadyDone"));
    if (req.points > 0) await notifyUsers(members.map((m) => m.userId), { type: "POINTS", title: `Được cộng ${req.points} điểm`, body: `Tình nguyện: ${req.task}`, link: "/dashboard" });
    refresh();
    return { data: { members: members.length, points: req.points }, message: t("community.sa.volCompleted", { points: req.points, n: members.length }) };
  });
}
