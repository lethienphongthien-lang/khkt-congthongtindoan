"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getT } from "@/lib/i18n/server";
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
    const t = await getT();
    const actor = await requireUser();
    const d = inputSchema.parse(input);
    if (d.mode === "teacher") {
      await leaders.appointTeacher(actor.id, d.accountId, d.position);
      revalidatePath("/settings"); return { message: t("dash.act.bchTeacher") };
    }
    const password = generateTempPassword();
    const u = await leaders.createStandaloneLeader(actor.id, { username: d.username, fullName: d.fullName, position: d.position, passwordHash: await hashPassword(password) });
    revalidatePath("/settings");
    return { message: t("dash.act.bchCreated"), data: { username: u.username, password } };
  });
}
export async function updateLeaderAction(id: string, input: unknown) {
  return run(async () => {
    const t = await getT();
    const actor = await requireUser();
    const data = z.object({ position, fullName: personName().optional() }).parse(input);
    await leaders.editLeader(actor.id, id, data); revalidatePath("/settings"); return { message: t("dash.act.bchUpdated") };
  });
}
export async function setLeaderStatusAction(id: string, status: "ACTIVE" | "LOCKED") {
  return run(async () => {
    const t = await getT();
    const actor = await requireUser();
    await leaders.changeLeaderStatus(actor.id, id, z.enum(["ACTIVE", "LOCKED"]).parse(status));
    revalidatePath("/settings"); return { message: status === "LOCKED" ? t("dash.act.bchRevoked") : t("dash.act.bchReopened") };
  });
}
export async function resetLeaderPasswordAction(id: string) {
  return run<{ username: string; password: string }>(async () => {
    const t = await getT();
    const actor = await requireUser(); const password = generateTempPassword();
    const u = await leaders.resetLeaderPassword(actor.id, id, await hashPassword(password));
    return { data: { username: u.username, password }, message: t("dash.act.tempPw") };
  });
}
