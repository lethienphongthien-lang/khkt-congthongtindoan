"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowLeft, Bell, Globe, MessagesSquare, ChevronDown, ChevronRight, KeyRound, LogOut } from "lucide-react";
import { cn, relativeTime } from "@/utils";
import { PAGE_TITLES, PATH_TITLES } from "@/lib/nav";
import { NotificationControls } from "@/components/notifications/controls";
import { DoanLogo } from "./logo";
import { ThemeMenuItem, ThemeToggle } from "./theme-toggle";
import { Avatar } from "@/components/ui/misc";
import { LogoutForm } from "./logout-button";
import { markAllNotificationsRead, markNotificationRead } from "@/actions/notifications";

export type NotificationItem = { id: string; title: string; body: string | null; link: string | null; read: boolean; createdAt: string };

function useOutside(ref: React.RefObject<HTMLElement | null>, onOut: () => void) {
  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && onOut();
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [ref, onOut]);
}

/**
 * Theo dõi xem trong phiên này người dùng đã đi qua trang nào trong ứng dụng chưa, để nút "Quay lại" về ĐÚNG TRANG TRƯỚC ĐÓ (lịch sử trình duyệt)
 * thay vì luôn về trang cha. Mở thẳng một đường dẫn (chưa có trang trước trong ứng dụng) thì dùng trang cha làm dự phòng.
 */
function useCanGoBack(pathname: string) {
  const [canGoBack, setCanGoBack] = useState(false);
  const prev = useRef(pathname);
  const popped = useRef(false);
  const depth = useRef(0);
  useEffect(() => {
    const onPop = () => { popped.current = true; };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  useEffect(() => {
    if (prev.current === pathname) return;
    prev.current = pathname;
    depth.current = popped.current ? Math.max(0, depth.current - 1) : depth.current + 1;
    popped.current = false;
    setCanGoBack(depth.current > 0);
  }, [pathname]);
  return canGoBack;
}

function Breadcrumb() {
  const router = useRouter();
  const pathname = usePathname();
  const canGoBack = useCanGoBack(pathname);
  const segs = pathname.split("/").filter(Boolean);
  // Đoạn không có tên (mã/ID) hiển thị là "Chi tiết" và liên kết về trang chi tiết đó.
  const crumbs = segs.map((s, i) => {
    const href = "/" + segs.slice(0, i + 1).join("/");
    return { href, label: PATH_TITLES[href] ?? PAGE_TITLES[s] ?? (i > 0 ? "Chi tiết" : undefined) };
  }).filter((c): c is { href: string; label: string } => !!c.label);
  if (!crumbs.length) return null;
  return (
    <nav aria-label="Đường dẫn" className="flex min-w-0 items-center gap-1 text-[13px] sm:gap-1.5 sm:text-sm">
      {crumbs.length > 1 && (canGoBack
        ? <button type="button" onClick={() => router.back()} aria-label="Quay lại trang trước" title="Quay lại trang trước" className="mr-0.5 -ml-1 shrink-0 rounded-md p-1.5 text-slate-600 hover:bg-slate-100"><ArrowLeft className="size-4" /></button>
        : <Link href={crumbs[crumbs.length - 2].href} aria-label="Quay lại" className="mr-0.5 -ml-1 shrink-0 rounded-md p-1.5 text-slate-600 hover:bg-slate-100"><ArrowLeft className="size-4" /></Link>)}
      {crumbs.map((c, i) => {
        const last = i === crumbs.length - 1;
        return (
          <span key={c.href} className={cn("min-w-0 items-center gap-1 sm:gap-1.5", last ? "flex" : "flex shrink-0 text-muted", i < crumbs.length - 1 && "max-sm:hidden")}>
            {last ? <span className="truncate font-semibold">{c.label}</span> : <><Link href={c.href} className="hover:text-primary">{c.label}</Link><ChevronRight className="size-3.5" /></>}
          </span>
        );
      })}
    </nav>
  );
}

function Notifications({ items, unread }: { items: NotificationItem[]; unread: number }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [, start] = useTransition();
  useOutside(ref, () => setOpen(false));
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} className="relative rounded-md p-2 text-slate-600 hover:bg-slate-100" aria-label="Thông báo">
        <Bell className="size-[18px]" />
        {unread > 0 && <span className="absolute top-1 right-1 flex min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] leading-4 font-semibold text-white">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 max-sm:fixed max-sm:inset-x-2 max-sm:top-14 max-sm:mt-0 max-sm:w-auto rounded-lg border border-border bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <span className="text-sm font-semibold">Thông báo</span>
            {unread > 0 && <button className="text-xs text-primary hover:underline" onClick={() => start(async () => { await markAllNotificationsRead(); router.refresh(); })}>Đánh dấu đã đọc</button>}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 && <p className="px-4 py-8 text-center text-sm text-muted">Chưa có thông báo</p>}
            {items.map((n) => {
              const inner = (
                <>
                  <div className="flex items-start gap-2">
                    {!n.read && <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />}
                    <div className="min-w-0">
                      <p className={cn("text-sm", !n.read && "font-medium")}>{n.title}</p>
                      {n.body && <p className="truncate text-xs text-muted">{n.body}</p>}
                      <p className="mt-0.5 text-[11px] text-slate-400">{relativeTime(n.createdAt)}</p>
                    </div>
                  </div>
                </>
              );
              const cls = "block border-b border-border px-4 py-2.5 last:border-0 hover:bg-slate-50";
              const onClick = () => { setOpen(false); if (!n.read) start(async () => { await markNotificationRead(n.id); router.refresh(); }); };
              return n.link ? <Link key={n.id} href={n.link} className={cls} onClick={onClick}>{inner}</Link>
                : <div key={n.id} className={cls} onClick={onClick}>{inner}</div>;
            })}
          </div>
          <div className="border-t border-border p-3"><NotificationControls compact /></div>
        </div>
      )}
    </div>
  );
}

export function Topbar({ user, roleLabel, notifications, unread, canChat }: {
  user: { fullName: string; avatarUrl: string | null }; roleLabel: string; notifications: NotificationItem[]; unread: number; canChat?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOutside(ref, () => setOpen(false));
  return (
    <header className="no-print sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-border bg-white/95 px-4 lg:px-6">
      <div className="flex min-w-0 items-center gap-2.5">
        <Link href="/dashboard" className="shrink-0 md:hidden" aria-label="Trang chủ"><DoanLogo className="h-8" /></Link>
        <Breadcrumb />
      </div>
      <div className="flex items-center gap-1">
        <Link href="/" className="flex h-8 items-center gap-1.5 rounded-md px-2 text-[13px] font-medium text-primary hover:bg-primary-light" aria-label="Mở cổng thông tin công khai" title="Mở cổng thông tin công khai"><Globe className="size-4" /><span className="max-sm:hidden">Cổng thông tin</span></Link>
        {canChat && <Link href="/team-chat" className="rounded-md p-2 text-primary hover:bg-primary-light md:hidden" aria-label="Kênh chat Ban chấp hành và Bí thư" title="Kênh chat"><MessagesSquare className="size-[18px]" /></Link>}
        <span className="max-md:hidden"><ThemeToggle /></span>
        <Notifications items={notifications} unread={unread} />
        <div ref={ref} className="relative">
          <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 rounded-md py-1 pr-2 pl-1.5 hover:bg-slate-100">
            <Avatar name={user.fullName} src={user.avatarUrl} size={28} />
            <span className="hidden text-left leading-tight sm:block">
              <span className="block text-[13px] font-medium">{user.fullName}</span>
              <span className="block text-[11px] text-muted">{roleLabel}</span>
            </span>
            <ChevronDown className="size-4 text-muted" />
          </button>
          {open && (
            <div className="absolute right-0 mt-2 w-52 rounded-lg border border-border bg-white py-1 shadow-lg">
              <Link href="/settings" onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-slate-50"><KeyRound className="size-4 text-muted" />Tài khoản & mật khẩu</Link>
              <div className="md:hidden"><ThemeMenuItem onDone={() => setOpen(false)} /></div>
              <LogoutForm variant="menu" />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
