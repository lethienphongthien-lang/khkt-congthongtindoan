import { UserError } from "@/lib/action";
/** Only intentional domain errors from the shared database commands may reach the UI. */
export async function runSharedCommand(query: () => Promise<unknown>): Promise<void> {
  try { await query(); }
  catch (error) {
    const e = error as { code?: string; meta?: { code?: string; message?: string } };
    if (e.code === "P2010" && e.meta?.code === "P0001" && typeof e.meta.message === "string") {
      throw new UserError(e.meta.message.replace(/^ERROR:\s*/, "").split("\n")[0]);
    }
    if (e.code === "P2010" && e.meta?.code === "23505") throw new UserError("Học sinh đã được phân công. Hãy tải lại danh sách.");
    throw error;
  }
}
