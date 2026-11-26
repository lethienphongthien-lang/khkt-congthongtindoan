import { NextResponse, type NextRequest } from "next/server";
import { SignJWT, jwtVerify } from "jose";

const SESSION_DAYS = 30; // khớp với src/lib/auth/session.ts

/** Phiên trượt: mỗi lần truy cập, nếu token đã quá 1 ngày tuổi thì cấp lại để người dùng đang dùng không bị đăng xuất. */
async function renewSession(req: NextRequest, res: NextResponse) {
  const token = req.cookies.get("doan_session")?.value;
  const secret = process.env.AUTH_SECRET;
  if (!token || !secret || secret.length < 32) return res;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    if (!payload.sub || !payload.iat || Date.now() / 1000 - payload.iat < 86400) return res;
    const fresh = await new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setSubject(payload.sub).setIssuedAt().setExpirationTime(`${SESSION_DAYS}d`).sign(new TextEncoder().encode(secret));
    res.cookies.set("doan_session", fresh, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: SESSION_DAYS * 24 * 3600 });
  } catch { /* token hỏng/hết hạn: để server xử lý */ }
  return res;
}

// Lớp chặn nhanh: chưa có cookie phiên thì chuyển về đăng nhập.
// Xác thực/ủy quyền thật sự luôn được kiểm tra ở server (requireUser / requireRole / actions).
const PUBLIC_PREFIXES = ["/login", "/forgot-password", "/gioi-thieu", "/ke-hoach", "/tin-tuc", "/tinh-nguyen", "/thong-bao", "/cau-chuyen-dep", "/tro-choi", "/on-thi-gplx", "/dinh-huong-nghe-nghiep", "/tai-lieu-sinh-hoat", "/lich-cong-tac", "/bao-cao-chi-doan", "/thi-dua", "/bai-viet", "/tim-kiem", "/gop-y", "/confession", "/api/cron", "/robots.txt", "/sitemap.xml", "/indexnow.txt"];

export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  // Trang chủ và các trang công khai không cần đăng nhập.
  if (pathname === "/" || PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))) return NextResponse.next();
  if (!req.cookies.get("doan_session")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  return renewSession(req, NextResponse.next());
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|api/upload|.*\\.(?:png|jpg|jpeg|svg|webp|ico|wav|html)$).*)"] };
