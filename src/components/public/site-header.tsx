"use client";
import Link from "next/link";
import { cdnImage } from "@/lib/image-url";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronRight, ExternalLink, Home, LayoutDashboard, LogIn, Mail, MapPin, Menu, Phone, Search, X } from "lucide-react";
import { cn } from "@/utils";
import { DoanLogo } from "@/components/layout/logo";
import type { MenuConfig } from "@/lib/menu-config";

/** Nhóm "Báo cáo Chi đoàn" trên điện thoại: dữ liệu Khối → lớp nằm ở trang riêng nên chỉ dẫn tới từng khối. */
const REPORT_LINKS = [
  { label: "Khối 10", href: "/bao-cao-chi-doan?khoi=10" }, { label: "Khối 11", href: "/bao-cao-chi-doan?khoi=11" },
  { label: "Khối 12", href: "/bao-cao-chi-doan?khoi=12" }, { label: "Chi đoàn giáo viên", href: "/bao-cao-chi-doan?khoi=gv" },
];

/** Liên kết ngoài hiển thị ở mục "Liên kết" (mở tab mới). */
const EXTERNAL_LINKS = [
  { label: "Trường THPT Sơn Hà", href: "https://c3sonha.quangngai.edu.vn/" },
  { label: "Sở GD&ĐT Quảng Ngãi", href: "https://quangngai.edu.vn/" },
  { label: "Bộ Giáo dục và Đào tạo", href: "https://moet.gov.vn/" },
  { label: "Trung ương Đoàn TNCS Hồ Chí Minh", href: "https://doanthanhnien.vn/" },
  { label: "Tỉnh Đoàn Quảng Ngãi", href: "https://tinhdoan.quangngai.gov.vn/" },
];

const isActive = (pathname: string, href: string) => {
  const base = href.split("?")[0];
  return base === "/" ? pathname === "/" : pathname === base || pathname.startsWith(base + "/");
};

/** Đã đăng nhập chưa (hỏi nhẹ /api/me để trang công khai vẫn được cache). */
function useLoggedIn() {
  const [yes, setYes] = useState(false);
  useEffect(() => {
    let alive = true;
    fetch("/api/me", { cache: "no-store" }).then((r) => r.json()).then((d) => alive && setYes(!!d.loggedIn)).catch(() => {});
    return () => { alive = false; };
  }, []);
  return yes;
}

const WEEKDAYS = ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"];
function Today() {
  const [text, setText] = useState("");
  useEffect(() => {
    const d = new Date(Date.now() + 7 * 3600_000); // giờ Việt Nam
    setText(`${WEEKDAYS[d.getUTCDay()]}, ${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`);
  }, []);
  return <span className="whitespace-nowrap">{text || " "}</span>;
}

function SearchBox({ className, autoFocus }: { className?: string; autoFocus?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  return (
    <form className={cn("flex overflow-hidden rounded border border-border bg-white", className)} onSubmit={(e) => { e.preventDefault(); if (q.trim()) router.push(`/tim-kiem?q=${encodeURIComponent(q.trim())}`); }} role="search">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm kiếm..." aria-label="Tìm kiếm" autoFocus={autoFocus} className="min-w-0 flex-1 px-3 py-1.5 text-sm outline-none" />
      <button type="submit" className="bg-primary px-3 text-white hover:bg-primary-dark" aria-label="Tìm"><Search className="size-4" /></button>
    </form>
  );
}

export function SiteHeader({ address, bannerUrl, phone, email, facebook, youtube, marquee, menu }: { menu: MenuConfig; address?: string; bannerUrl?: string; phone?: string; email?: string; facebook?: string; youtube?: string; marquee: { id: string; text: string; link: string | null }[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false); // ô tìm kiếm trên điện thoại (bấm biểu tượng để mở)
  // Chỉ đóng menu khi thật sự chuyển trang (không đóng ngay sau khi vừa bấm mở)
  const lastPath = useRef(pathname);
  useEffect(() => {
    if (lastPath.current !== pathname) { lastPath.current = pathname; setOpen(false); }
  }, [pathname]);
  const loggedIn = useLoggedIn();
  const main = menu.top.filter((it) => !it.hidden).map((it) => ({ ...it, children: it.children?.filter((c) => !c.hidden) }));
  // Điện thoại: các mục thanh trên, rồi các nhóm của thanh bên trái (bỏ mục trùng liên kết đã có ở trên)
  const shown = new Set(main.flatMap((it) => [it.href, ...(it.children ?? []).map((c) => c.href)]));
  const groups = menu.side.filter((g) => !g.hidden).map((g) => ({ id: g.id, title: g.title, items: g.kind === "reports" ? REPORT_LINKS : g.items.filter((i) => !i.hidden && !shown.has(i.href)) })).filter((g) => g.items.length);

  return (
    <header className="no-print contents">
      {/* Thanh liên hệ */}
      {(phone || email || facebook || youtube) && (
        <div className="bg-[#0a4a94] text-white max-lg:hidden">
          <div className="flex w-full flex-wrap items-center justify-between gap-x-6 gap-y-0.5 px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm lg:px-8">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-0.5">
            {phone && <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-1.5 hover:underline"><Phone className="size-3.5 text-[#ffd400]" />Hotline: {phone}</a>}
            {email && <a href={`mailto:${email}`} className="max-sm:hidden inline-flex items-center gap-1.5 hover:underline"><Mail className="size-3.5 text-[#ffd400]" />Email: {email}</a>}
            </div>
            <div className="flex items-center gap-4">
              {facebook && <a href={facebook} target="_blank" rel="noopener noreferrer" className="hover:underline">Facebook</a>}
              {youtube && <a href={youtube} target="_blank" rel="noopener noreferrer" className="hover:underline">Youtube</a>}
            </div>
          </div>
        </div>
      )}
      {/* Đầu trang trên điện thoại/máy tính bảng: MỘT thanh gọn kiểu ứng dụng (☰ + logo + tên | tìm kiếm | đăng nhập) */}
      <div className="sticky top-0 z-50 border-b border-border bg-white shadow-sm lg:hidden">
        <div className="flex h-14 items-center gap-0.5 px-1.5">
          <button type="button" onClick={() => { setOpen((o) => !o); setSearchOpen(false); }} aria-label={open ? "Đóng menu" : "Mở menu"} aria-expanded={open}
            className="flex size-9 shrink-0 touch-manipulation items-center justify-center rounded-full text-primary-dark hover:bg-primary-light active:bg-primary-light">
            {open ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
          <Link href="/" className="flex min-w-0 flex-1 items-center gap-1.5 pl-0.5" aria-label="Trang chủ">
            <DoanLogo className="h-8 shrink-0" />
            <div className="min-w-0 leading-tight">
              <div className="truncate text-[9px] font-semibold tracking-[0.1em] text-slate-500 uppercase">Đoàn TNCS Hồ Chí Minh</div>
              <div className="whitespace-nowrap text-[clamp(11px,3.5vw,14px)] font-extrabold tracking-normal text-primary-dark uppercase">Đoàn trường THPT Sơn Hà</div>
            </div>
          </Link>
          <button type="button" onClick={() => { setSearchOpen((o) => !o); setOpen(false); }} aria-label="Tìm kiếm" aria-expanded={searchOpen}
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-primary-dark hover:bg-primary-light active:bg-primary-light">
            {searchOpen ? <X className="size-5" /> : <Search className="size-5" />}
          </button>
          <Link href={loggedIn ? "/dashboard" : "/login"} aria-label={loggedIn ? "Vào trang quản lý" : "Đăng nhập"}
            className="ml-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-white hover:bg-primary-dark">
            {loggedIn ? <LayoutDashboard className="size-[18px]" /> : <LogIn className="size-[18px]" />}
          </Link>
        </div>
        {searchOpen && <div className="px-3 pb-3"><SearchBox className="w-full" autoFocus /></div>}
        {open && (
          <div className="fixed inset-x-0 top-14 bottom-0 z-50 overflow-y-auto bg-white pb-8">
            <ul className="divide-y divide-border">
              <li><Link href="/" className={cn("flex items-center justify-between px-4 py-3.5 text-[15px] font-semibold text-slate-800", pathname === "/" && "bg-primary-light text-primary-dark")}>Trang chủ<ChevronRight className="size-4 text-slate-400" /></Link></li>
              {main.map((it) => (
                <li key={it.id}>
                  <Link href={it.href} className={cn("flex items-center justify-between px-4 py-3.5 text-[15px] font-semibold text-slate-800", isActive(pathname, it.href) && "bg-primary-light text-primary-dark")}>{it.label}<ChevronRight className="size-4 text-slate-400" /></Link>
                  {it.children && it.children.length > 0 && (
                    <ul className="bg-slate-50 pb-1.5">
                      {it.children.map((c) => <li key={c.id}><Link href={c.href} className="block py-2 pr-4 pl-8 text-sm text-slate-600">{c.label}</Link></li>)}
                    </ul>
                  )}
                </li>
              ))}
              {groups.map((g) => (
                <li key={g.id}>
                  <div className="px-4 pt-3.5 pb-1 text-xs font-semibold tracking-wide text-slate-500 uppercase">{g.title}</div>
                  <ul className="pb-1.5">{g.items.map((c) => <li key={c.href}><Link href={c.href} className="block py-2 pr-4 pl-8 text-sm text-slate-600">{c.label}</Link></li>)}</ul>
                </li>
              ))}
              <li>
                <div className="px-4 pt-3.5 pb-1 text-xs font-semibold tracking-wide text-slate-500 uppercase">Liên kết</div>
                <ul className="pb-1.5">
                  {EXTERNAL_LINKS.map((c) => <li key={c.href}><a href={c.href} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between py-2.5 pr-4 pl-4 text-sm text-slate-700">{c.label}<ExternalLink className="size-3.5 text-slate-400" /></a></li>)}
                </ul>
              </li>
            </ul>
            {(phone || email || facebook || youtube) && (
              <div className="mt-2 space-y-2 border-t border-border px-4 pt-4 text-sm text-slate-700">
                {phone && <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className="flex items-center gap-2"><Phone className="size-4 text-primary" />Hotline: {phone}</a>}
                {email && <a href={`mailto:${email}`} className="flex items-center gap-2"><Mail className="size-4 text-primary" />{email}</a>}
                {address && <p className="flex items-center gap-2"><MapPin className="size-4 shrink-0 text-primary" />{address}</p>}
                {(facebook || youtube) && <div className="flex gap-4 pt-1 text-primary">{facebook && <a href={facebook} target="_blank" rel="noopener noreferrer" className="font-medium">Facebook</a>}{youtube && <a href={youtube} target="_blank" rel="noopener noreferrer" className="font-medium">Youtube</a>}</div>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hàng thương hiệu: logo + tên | tìm kiếm | đăng nhập (thấp, gọn) */}
      <div className="border-b border-border bg-white max-lg:hidden">
        <div className="flex w-full items-center gap-4 px-3 py-2.5 sm:px-4 sm:py-3 lg:px-8">
          <Link href="/" className="flex min-w-0 shrink-0 items-center gap-2.5" aria-label="Trang chủ">
            <DoanLogo className="h-11 shrink-0 sm:h-14" />
            <div className="min-w-0 leading-tight">
              <p className="text-[10px] font-semibold tracking-[0.15em] text-slate-500 uppercase sm:text-[13px]">Đoàn TNCS Hồ Chí Minh</p>
              <h1 className="text-sm font-extrabold tracking-wide text-primary-dark uppercase sm:text-xl">Đoàn trường THPT Sơn Hà</h1>
              {address && <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500 sm:text-xs"><MapPin className="size-3 shrink-0 text-primary" /><span className="truncate">{address}</span></p>}
            </div>
          </Link>
          <SearchBox className="ml-auto hidden w-full max-w-xl lg:flex" />
        </div>
      </div>

      {/* Thanh menu */}
      <div className="sticky top-0 z-40 shadow-md max-lg:hidden">
        <nav className="bg-[#073a70]" aria-label="Menu chính">
          <div className="flex w-full items-center px-1 lg:px-6">
            <ul className="hidden min-w-0 items-stretch divide-x divide-white/20 lg:flex">
              <li><Link href="/" aria-label="Trang chủ" className={cn("flex h-full items-center px-[clamp(9px,1.1vw,22px)] py-1.5 text-white hover:bg-white/10", pathname === "/" && "bg-white/15")}><Home className="size-5" /></Link></li>
              {main.map((it) => (
                <li key={it.id} className="group relative">
                  <Link href={it.href} className={cn("flex h-full items-center gap-1 px-[clamp(8px,1vw,22px)] py-1.5 text-[clamp(11px,0.78vw+3px,14px)] font-semibold tracking-wide whitespace-nowrap text-white/90 uppercase hover:bg-white/10 hover:text-white", isActive(pathname, it.href) && "bg-white text-primary-dark hover:bg-white hover:text-primary-dark")}>
                    {it.short ? <><span className="min-[1360px]:hidden">{it.short}</span><span className="max-[1359px]:hidden">{it.label}</span></> : it.label}{it.children && it.children.length > 0 && <ChevronDown className="size-3.5 opacity-70" />}
                  </Link>
                  {it.children && it.children.length > 0 && (
                    <ul className="invisible absolute left-0 z-10 min-w-52 border border-border bg-white py-1 text-foreground opacity-0 shadow-lg transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                      {it.children.map((c) => <li key={c.id}><Link href={c.href} className="block px-4 py-2 text-sm hover:bg-primary-light hover:text-primary-dark">{c.label}</Link></li>)}
                    </ul>
                  )}
                </li>
              ))}
              <li className="group relative">
                <button type="button" className="flex h-full items-center gap-1 px-[clamp(8px,1vw,22px)] py-1.5 text-[clamp(11px,0.78vw+3px,14px)] font-semibold tracking-wide whitespace-nowrap text-white/90 uppercase hover:bg-white/10 hover:text-white focus:bg-white/10" aria-haspopup="menu">
                  Liên kết<ChevronDown className="size-3.5 opacity-70" />
                </button>
                <ul className="invisible absolute left-0 z-10 min-w-72 border border-border bg-white py-1 text-foreground opacity-0 shadow-lg transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                  {EXTERNAL_LINKS.map((c) => <li key={c.href}><a href={c.href} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-3 px-4 py-2 text-sm hover:bg-primary-light hover:text-primary-dark">{c.label}<ExternalLink className="size-3.5 opacity-50" /></a></li>)}
                </ul>
              </li>
            </ul>
            <Link href={loggedIn ? "/dashboard" : "/login"} className="ml-auto flex shrink-0 items-center px-3 py-1.5 text-xs font-semibold tracking-wide whitespace-nowrap text-white/90 uppercase hover:bg-white/10 hover:text-white sm:px-4 sm:text-sm">
              {loggedIn ? "Quản lý" : "Đăng nhập"}
            </Link>
          </div>
        </nav>
      </div>

      {/* Banner full chiều ngang (chỉ trang chủ): ảnh Admin tải lên, hoặc banner mặc định nền trời xanh nhạt + toà nhà + khẩu hiệu */}
      {pathname === "/" && (
        <div className="relative w-full overflow-hidden border-b border-primary/15">
          {bannerUrl ? (
            <div className="h-28 sm:h-36 lg:h-44">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cdnImage(bannerUrl, 1600)} alt="Banner Đoàn trường THPT Sơn Hà" fetchPriority="high" decoding="async" className="size-full object-cover object-center" />
            </div>
          ) : (
            <div className="relative h-32 bg-gradient-to-b from-[#5a9fe0] via-[#97c6ee] to-[#d9ecfb] sm:h-40 lg:h-52">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/banner-art.webp" alt="" aria-hidden decoding="async" className="pointer-events-none absolute inset-0 size-full object-cover object-bottom" />
              {/* quầng sáng nhẹ sau khối chữ giữa để chữ luôn rõ trên nền đậm */}
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_42%_75%_at_50%_52%,rgba(255,255,255,0.62),rgba(255,255,255,0)_72%)]" />

              {/* Hai bên: các dòng viết tay (từ màn hình lớn) */}
              <div className="pointer-events-none absolute top-1/2 left-[3%] hidden -translate-y-1/2 -rotate-3 font-script text-[#0a3d82] xl:block">
                <div className="text-4xl leading-tight 2xl:text-5xl">Tuổi trẻ</div>
                <div className="text-4xl leading-tight 2xl:text-5xl">Sơn Hà</div>
                <svg viewBox="0 0 220 14" className="mt-1 w-44 2xl:w-52"><path d="M4 10 C 50 3, 140 2, 216 8" fill="none" stroke="#ffd400" strokeWidth="5" strokeLinecap="round" /></svg>
              </div>
              <div className="pointer-events-none absolute top-1/2 right-[3%] hidden -translate-y-1/2 rotate-3 text-right font-script text-[#0a3d82] xl:block">
                {["Tiên phong", "Sáng tạo", "Phát triển"].map((t) => (
                  <div key={t} className="flex items-center justify-end gap-2 text-3xl leading-tight 2xl:text-4xl">
                    {t}<svg viewBox="0 0 24 24" className="size-4 text-[#ffd400]" fill="currentColor"><path d="M12 2l2.9 6.9 7.1.6-5.4 4.7 1.7 7.1L12 17.6 5.7 21.3l1.7-7.1L2 9.5l7.1-.6z" /></svg>
                  </div>
                ))}
              </div>

              {/* Giữa: huy hiệu + thông tin */}
              <div className="relative flex h-full items-center justify-center gap-3 px-4 sm:gap-5 lg:gap-7">
                <DoanLogo className="h-16 shrink-0 drop-shadow-md sm:h-24 lg:h-36" />
                <div className="min-w-0 leading-tight">
                  <p className="text-[10px] font-bold tracking-[0.18em] text-primary uppercase sm:text-sm lg:text-lg">Cổng thông tin điện tử</p>
                  <h2 className="text-[17px] font-extrabold tracking-tight text-[#0a3d82] uppercase sm:text-3xl lg:text-5xl">Đoàn trường THPT Sơn Hà</h2>
                  <p className="mt-0.5 text-[9px] font-semibold tracking-[0.2em] text-primary uppercase sm:mt-1 sm:text-xs lg:text-base">Đoàn TNCS Hồ Chí Minh</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Hàng ngày – dòng chữ chạy – tìm kiếm */}
      <div className="border-b border-border bg-slate-100/90">
        <div className="flex w-full flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-1.5 text-sm sm:px-4 sm:py-2 sm:flex-nowrap lg:px-8">
          <span className="text-xs font-semibold text-slate-600 max-sm:hidden sm:text-sm"><Today /></span>
          <Marquee items={marquee} className="order-last w-full sm:order-none sm:w-auto sm:flex-1" />
                  </div>
      </div>
    </header>
  );
}

/** Chữ chạy ngang; rê chuột để dừng. Người dùng bật "giảm chuyển động" thì hiện đứng yên. */
function Marquee({ items, className }: { items: { id: string; text: string; link: string | null }[]; className?: string }) {
  const chars = items.reduce((n, i) => n + i.text.length + 4, 0);
  // Nội dung được lặp đủ rộng (>= ~2000px) rồi nhân đôi, chạy -50% => các dòng chữ nối đuôi nhau liên tục, không có khoảng trống.
  const repeat = Math.max(1, Math.ceil(2000 / (chars * 11)));
  const set = items.map((it) => {
    const node = it.link ? <Link href={it.link} className="hover:underline">{it.text}</Link> : <span>{it.text}</span>;
    return <span key={it.id} className="inline-flex shrink-0 items-center">{node}<span className="mx-6 text-[#e0a800]" aria-hidden>★</span></span>;
  });
  const group = (k: number) => (
    <div key={k} className="inline-flex shrink-0 items-center" aria-hidden={k === 1}>
      {Array.from({ length: repeat }, (_, r) => <span key={r} className="inline-flex shrink-0 items-center">{set}</span>)}
    </div>
  );
  return (
    <div className={cn("marquee text-[13px] font-extrabold tracking-wide text-primary uppercase sm:text-base", className)} role="marquee" aria-label="Thông điệp">
      <div className="marquee-track" style={{ animationDuration: `${Math.max(20, chars * repeat * 0.2)}s` }}>{group(0)}{group(1)}</div>
    </div>
  );
}
