import { NextResponse, type NextRequest } from "next/server";

// Lớp chặn nhanh: chưa có cookie phiên thì chuyển về đăng nhập.
// Xác thực/ủy quyền thật sự luôn được kiểm tra ở server (requireUser / requireRole / actions).
const PUBLIC_PREFIXES = ["/login", "/forgot-password", "/gioi-thieu", "/ke-hoach", "/tin-tuc", "/tinh-nguyen", "/thong-bao", "/cau-chuyen-dep", "/tro-choi", "/on-thi-gplx", "/dinh-huong-nghe-nghiep", "/tai-lieu-sinh-hoat", "/lich-cong-tac", "/bao-cao-chi-doan", "/thi-dua", "/bai-viet", "/tim-kiem", "/gop-y", "/confession", "/api/cron", "/robots.txt", "/sitemap.xml", "/indexnow.txt"];

export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  // Trang chủ và các trang công khai không cần đăng nhập.
  if (pathname === "/" || PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))) return NextResponse.next();
  if (!req.cookies.get("doan_session")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|api/upload|.*\\.(?:png|jpg|jpeg|svg|webp|ico|wav|html)$).*)"] };
