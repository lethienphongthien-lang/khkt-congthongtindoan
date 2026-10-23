import "server-only";
import { headers } from "next/headers";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

type Tx = Prisma.TransactionClient | typeof db;

export async function getRequestMeta() {
  try {
    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null;
    return { ip, userAgent: h.get("user-agent")?.slice(0, 300) ?? null };
  } catch {
    return { ip: null, userAgent: null };
  }
}

export async function audit(
  userId: string | null,
  action: string,
  target: string,
  targetId?: string | null,
  metadata?: Prisma.InputJsonValue,
  client: Tx = db,
) {
  const { ip } = await getRequestMeta();
  await client.auditLog.create({
    data: { userId, action, target, targetId: targetId ?? null, metadata, ipAddress: ip },
  });
}
