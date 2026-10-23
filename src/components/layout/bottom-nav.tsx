"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Grip, LogOut } from "lucide-react";
import type { Role } from "@prisma/client";
import { cn } from "@/utils";
import { mobileNav, type NavItem } from "@/lib/nav";
import { LogoutForm } from "./logout-button";

/** Một dòng trong bảng "Thêm": biểu tượng + tên, cùng kích thước cho mọi mục. */
function Row({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link href={item.href} className={cn("flex min-w-0 items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm", active ? "bg-primary-light font-semibold text-primary-dark" : "text-slate-700 active:bg-slate-100")}>
      <item.icon className="size-5 shrink-0 text-slate-500" /><span className="truncate">{item.label}</span>
    </Link>
  );
}

type Section = { title?: string; icon?: NavItem["icon"]; items: NavItem[] };
/** Gom các mục đơn thành một nhóm không tiêu đề; mỗi nhóm menu là một khối có tiêu đề, mục con trải đều dạng dòng. */
function toSections(more: NavItem[]): Section[] {
  const singles: NavItem[] = more.filter((i) => !i.children);
  const groups: Section[] = more.filter((i) => i.children).map((g) => ({ title: g.label, icon: g.icon, items: g.children!.map((c) => ({ href: c.href, label: c.label, icon: c.icon ?? g.icon })) }));
  return [...(singles.length ? [{ items: singles }] : []), ...groups];
}

const isActive = (pathname: string, it: NavItem) => { const h = it.match ?? it.href; return pathname === h || (h !== "/dashboard" && pathname.startsWith(h + "/")); };

function Tab({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link href={item.href} className={cn("flex min-w-0 flex-1 flex-col items-center gap-0.5 py-1.5 text-[11px]", active ? "font-semibold text-primary" : "text-slate-500")} aria-current={active ? "page" : undefined}>
      <item.icon className="size-[22px]" strokeWidth={active ? 2.4 : 1.8} />
      <span className="max-w-full truncate px-0.5">{item.label}</span>
    </Link>
  );
}

/** Thanh điều hướng dưới cho mobile: 2 mục — nút Thêm (giữa) — 2 mục. */
export function BottomNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const { main, more } = mobileNav(role);
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  const moreActive = more.some((i) => isActive(pathname, i) || (i.children ?? []).some((c) => pathname === c.href || pathname.startsWith(c.href + "/")));
  const sections = toSections(more);

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white pb-[calc(5.5rem+env(safe-area-inset-bottom))] shadow-2xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Chức năng khác">
            <div className="mx-auto my-2 h-1 w-10 rounded-full bg-slate-200" />
            <div className="max-h-[75dvh] overflow-y-auto overscroll-contain px-3 pt-1 pb-2">
              {sections.map((sec, i) => (
                <div key={i} className="mb-2">
                  {sec.title && <div className="flex items-center gap-1.5 px-2 pt-2 pb-1 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">{sec.icon && <sec.icon className="size-3.5" />}{sec.title}</div>}
                  <div className="grid grid-cols-2 gap-1">
                    {sec.items.map((it) => <Row key={it.href} item={it} active={isActive(pathname, it)} />)}
                  </div>
                </div>
              ))}
              <LogoutForm variant="sheet" className="mt-1 border-t border-border pt-2" />
            </div>
          </div>
        </div>
      )}
      <nav className="no-print fixed inset-x-0 bottom-0 z-50 border-t border-border bg-white pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Điều hướng nhanh">
        <div className="flex items-end px-1">
          <Tab item={main[0]} active={isActive(pathname, main[0])} />
          <Tab item={main[1]} active={isActive(pathname, main[1])} />
          <div className="flex flex-1 justify-center">
            <button onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Thêm chức năng"
              className={cn("-mt-4 mb-1 flex size-14 flex-col items-center justify-center rounded-full border-4 border-white bg-primary text-white shadow-md transition-colors active:bg-primary-dark", (open || moreActive) && "bg-primary-dark")}>
              <Grip className="size-6" />
            </button>
          </div>
          <Tab item={main[2]} active={isActive(pathname, main[2])} />
          <Tab item={main[3]} active={isActive(pathname, main[3])} />
        </div>
      </nav>
    </>
  );
}
