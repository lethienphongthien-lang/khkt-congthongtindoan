"use server";

import { revalidatePath } from "next/cache";
import { generateAuthenticationOptions, generateRegistrationOptions, verifyAuthenticationResponse, verifyRegistrationResponse } from "@simplewebauthn/server";
import type { AuthenticationResponseJSON, AuthenticatorTransport, RegistrationResponseJSON } from "@simplewebauthn/server";
import { db } from "@/lib/db";
import { run, UserError } from "@/lib/action";
import { audit } from "@/lib/audit";
import { createSession, requireUser } from "@/lib/auth/session";
import { RP_NAME, fromB64, relyingParty, saveChallenge, takeChallenge, toB64 } from "@/lib/webauthn";

const MAX_PASSKEYS = 5;

// ---------- Đăng ký (người dùng đã đăng nhập) ----------

export async function startPasskeyRegistrationAction() {
  return run<{ options: Awaited<ReturnType<typeof generateRegistrationOptions>> }>(async () => {
    const user = await requireUser();
    const existing = await db.passkey.findMany({ where: { userId: user.id }, select: { credentialId: true, transports: true } });
    if (existing.length >= MAX_PASSKEYS) throw new UserError(`Mỗi tài khoản tối đa ${MAX_PASSKEYS} thiết bị đăng nhập nhanh, hãy xóa bớt`);
    const { rpID } = await relyingParty();
    const options = await generateRegistrationOptions({
      rpName: RP_NAME, rpID, userName: user.username, userDisplayName: user.fullName, userID: new TextEncoder().encode(user.id),
      attestationType: "none",
      excludeCredentials: existing.map((c) => ({ id: c.credentialId, transports: (c.transports?.split(",").filter(Boolean) ?? []) as AuthenticatorTransport[] })),
      authenticatorSelection: { residentKey: "preferred", userVerification: "preferred" },
    });
    await saveChallenge(options.challenge, "reg", user.id);
    return { data: { options } };
  });
}

export async function finishPasskeyRegistrationAction(response: RegistrationResponseJSON, deviceName: string) {
  return run(async () => {
    const user = await requireUser();
    const saved = await takeChallenge("reg");
    if (!saved || saved.userId !== user.id) throw new UserError("Phiên đăng ký đã hết hạn, hãy thử lại");
    const { rpID, origin } = await relyingParty();
    let verification;
    try {
      verification = await verifyRegistrationResponse({ response, expectedChallenge: saved.challenge, expectedOrigin: origin, expectedRPID: rpID, requireUserVerification: false });
    } catch {
      throw new UserError("Không xác thực được thiết bị, hãy thử lại");
    }
    if (!verification.verified) throw new UserError("Không xác thực được thiết bị, hãy thử lại");
    const cred = verification.registrationInfo.credential;
    await db.passkey.create({
      data: {
        userId: user.id, credentialId: cred.id, publicKey: toB64(cred.publicKey), counter: cred.counter,
        transports: cred.transports?.join(",") ?? null, deviceName: deviceName.trim().slice(0, 60) || "Thiết bị của tôi",
      },
    });
    await audit(user.id, "passkey.add", "User", user.id);
    revalidatePath("/settings");
    return { message: "Đã bật đăng nhập nhanh trên thiết bị này" };
  });
}

export async function deletePasskeyAction(id: string) {
  return run(async () => {
    const user = await requireUser();
    const r = await db.passkey.deleteMany({ where: { id, userId: user.id } });
    if (!r.count) throw new UserError("Không tìm thấy thiết bị");
    await audit(user.id, "passkey.remove", "User", user.id);
    revalidatePath("/settings");
    return { message: "Đã xóa thiết bị đăng nhập nhanh" };
  });
}

// ---------- Đăng nhập bằng vân tay / khuôn mặt (chưa cần đăng nhập) ----------

export async function startPasskeyLoginAction() {
  return run<{ options: Awaited<ReturnType<typeof generateAuthenticationOptions>> }>(async () => {
    const { rpID } = await relyingParty();
    // Không chỉ định tài khoản: thiết bị tự đề xuất khóa đã lưu cho trang này.
    const options = await generateAuthenticationOptions({ rpID, userVerification: "preferred" });
    await saveChallenge(options.challenge, "auth");
    return { data: { options } };
  });
}

export async function finishPasskeyLoginAction(response: AuthenticationResponseJSON) {
  return run<{ mustChangePassword: boolean }>(async () => {
    const saved = await takeChallenge("auth");
    if (!saved) throw new UserError("Phiên đăng nhập đã hết hạn, hãy thử lại");
    const pk = await db.passkey.findUnique({ where: { credentialId: response.id }, include: { user: true } });
    if (!pk) throw new UserError("Thiết bị này chưa được đăng ký đăng nhập nhanh. Hãy đăng nhập bằng mật khẩu rồi bật ở Cài đặt");
    const { rpID, origin } = await relyingParty();
    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response, expectedChallenge: saved.challenge, expectedOrigin: origin, expectedRPID: rpID, requireUserVerification: false,
        credential: { id: pk.credentialId, publicKey: fromB64(pk.publicKey), counter: pk.counter, transports: (pk.transports?.split(",").filter(Boolean) ?? []) as AuthenticatorTransport[] },
      });
    } catch {
      throw new UserError("Không xác thực được, hãy thử lại hoặc đăng nhập bằng mật khẩu");
    }
    if (!verification.verified) throw new UserError("Không xác thực được, hãy thử lại hoặc đăng nhập bằng mật khẩu");
    if (pk.user.status !== "ACTIVE") throw new UserError("Tài khoản đã bị khóa. Vui lòng liên hệ Ban chấp hành Đoàn trường");
    await db.$transaction([
      db.passkey.update({ where: { id: pk.id }, data: { counter: verification.authenticationInfo.newCounter, lastUsedAt: new Date() } }),
      db.user.update({ where: { id: pk.userId }, data: { lastLoginAt: new Date() } }),
    ]);
    await createSession(pk.userId);
    await audit(pk.userId, "auth.login_passkey", "User", pk.userId);
    return { data: { mustChangePassword: pk.user.mustChangePassword } };
  });
}
