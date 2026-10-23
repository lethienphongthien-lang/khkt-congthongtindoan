import "server-only";
import { cookies, headers } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { getAuthSecret } from "@/lib/env";

export const RP_NAME = "Đoàn trường THPT Sơn Hà";
const COOKIE = "doan_wa";

/** Tên miền (rpID) và nguồn (origin) lấy theo địa chỉ đang truy cập: passkey gắn với tên miền này. */
export async function relyingParty() {
  const h = await headers();
  const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000").split(",")[0].trim();
  const proto = (h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https")).split(",")[0].trim();
  return { rpID: host.replace(/:\d+$/, ""), origin: `${proto}://${host}` };
}

type Purpose = "reg" | "auth";

/** Lưu "thử thách" (challenge) của lượt đăng ký/đăng nhập vào cookie ký số, sống 5 phút (không cần bảng trong database). */
export async function saveChallenge(challenge: string, purpose: Purpose, userId?: string) {
  const token = await new SignJWT({ c: challenge, p: purpose, ...(userId ? { u: userId } : {}) })
    .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("5m").sign(getAuthSecret());
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 300 });
}

export async function takeChallenge(purpose: Purpose): Promise<{ challenge: string; userId?: string } | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  jar.delete(COOKIE); // dùng một lần
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getAuthSecret());
    if (payload.p !== purpose || typeof payload.c !== "string") return null;
    return { challenge: payload.c, userId: typeof payload.u === "string" ? payload.u : undefined };
  } catch {
    return null;
  }
}

export const toB64 = (u8: Uint8Array) => Buffer.from(u8).toString("base64url");
export const fromB64 = (s: string) => new Uint8Array(Buffer.from(s, "base64url"));
