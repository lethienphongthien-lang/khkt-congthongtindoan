"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { run } from "@/lib/action";
import { requireUser } from "@/lib/auth/session";
import { generateTempPassword, hashPassword } from "@/lib/auth/password";
import { personName } from "@/lib/validation/rules";
import * as leaders from "@/lib/services/union-leaders";

const position = z.string().trim().min(2).max(60);
const inputSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("teacher"), accountId: z.string().min(1).max(100), position }),
  z.object({ mode: z.literal("new"), fullName: personName(), username: z.string().trim().min(3).max(40).regex(/^[a-zA-Z0-9._-]+$/), position }),
]);
export async function createLeaderAction(input: unknown) {
  return run<{ username: string; password: string }>(async () => {
    const actor = await requireUser();
    const d = inputSchema.parse(input);
    if (d.mode === "teacher") {
      await leaders.appointTeacher(actor.id, d.accountId, d.position);
      revalidatePath("/settings"); return { message: "Đã phân công BCH trên tài khoản giáo viên" };
    }
    const password = generateTempPassword();
    const u = await leaders.createStandaloneLeader(actor.id, { username: d.username, fullName: d.fullName, position: d.position, passwordHash: await hashPassword(password) });
    revalidatePath("/settings");
    return { message: "Đã tạo tài khoản BCH riêng", data: { username: u.username, password } };
  });
}
export async function updateLeaderAction(id: string, input: unknown) {
  return run(async () => {
    const actor = await requireUser();
    const data = z.object({ position, fullName: personName().optional() }).parse(input);
    await leaders.editLeader(actor.id, id, data); revalidatePath("/settings"); return { message: "Đã cập nhật BCH" };
  });
}
export async function setLeaderStatusAction(id: string, status: "ACTIVE" | "LOCKED") {
  return run(async () => {
    const actor = await requireUser();
    await leaders.changeLeaderStatus(actor.id, id, z.enum(["ACTIVE", "LOCKED"]).parse(status));
    revalidatePath("/settings"); return { message: status === "LOCKED" ? "Đã thu hồi quyền BCH" : "Đã mở lại tài khoản BCH" };
  });
}
export async function resetLeaderPasswordAction(id: string) {
  return run<{ username: string; password: string }>(async () => {
    const actor = await requireUser(); const password = generateTempPassword();
    const u = await leaders.resetLeaderPassword(actor.id, id, await hashPassword(password));
    return { data: { username: u.username, password }, message: "Đã cấp mật khẩu tạm thời" };
  });
}
