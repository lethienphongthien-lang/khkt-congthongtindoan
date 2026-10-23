"use server";

import { revalidatePath } from "next/cache";
import { run } from "@/lib/action";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/session";
import { runCleanup } from "@/lib/services/cleanup";

export async function runCleanupAction() {
  return run(async () => {
    const admin = await requireRole(["ADMIN"]);
    const r = await runCleanup();
    await audit(admin.id, "data.cleanup", "System", null, r);
    revalidatePath("/settings");
    return { message: `Đã dọn ${r.notifications} thông báo và ${r.auditLogs} dòng nhật ký cũ` };
  });
}
