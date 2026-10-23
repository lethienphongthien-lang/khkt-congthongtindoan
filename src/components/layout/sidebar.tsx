"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown, Settings } from "lucide-react";
import type { Role } from "@prisma/client";
import { cn } from "@/utils";
import { navFor, type NavItem } from "@/lib/nav";
import { LogoutForm } from "./logout-button";
import { DoanLogo } from "./logo";

function NavGroup({ item, labels }: { item: NavItem; labels: string }) {
  const pathname = usePathname();
  const children = item.children ?? [];
  const inside = children.some((c) => pathname === c.href || pathname.startsWith(c.href + "/")) || pathname.startsWith((item.match ?? item.href) + "/");
  // Nhóm mở sẵn nếu được đánh dấu `open` hoặc đang ở một mục bên trong; vẫn bấm để mở/thu gọn thủ công.
  const [open, setOpen] = useState(item.open ?? inside);
  useEffect(() => { if (inside) setOpen(true); }, [inside]); // đi vào một mục thì nhóm chứa nó tự mở
  useEffect(() => { if (inside) setOpen(true); }, [inside]);
  return (
    <div>
      <div className={cn("flex items-center rounded-md text-sm transition-colors", inside ? "bg-white/15 font-medium text-white" : "text-blue-50 hover:bg-white/10")}>
        {/* Tablet (thanh bên thu gọn): bấm icon để vào mục con đầu tiên */}
        <Link href={children[0]?.href ?? item.href} title={item.label} className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2 lg:hidden"><item.icon className="size-[18px] shrink-0" /></Link>
        <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="hidden min-w-0 flex-1 items-center gap-3 px-3 py-2 text-left lg:flex">
          <item.icon className="size-[18px] shrink-0" /><span className="flex-1">{item.label}</span>
          <ChevronDown className={cn("size-4 shrink-0 transition-transform", open && "rotate-180")} />
        </button>
      </div>
      {open && (
        <div className={cn("mt-0.5 mb-1 space-y-0.5 border-l border-white/20 pl-2", labels === "inline" ? "ml-5" : "ml-5 max-lg:hidden")}>
          {children.map((c) => {
            const active = pathname === c.href || pathname.startsWith(c.href + "/");
            return <Link key={c.href} href={c.href} className={cn("block rounded-md px-3 py-1.5 text-[13px] transition-colors", active ? "bg-white font-medium text-primary-dark" : "text-blue-100 hover:bg-white/10")}>{c.label}</Link>;
          })}
        </div>
      )}
    </div>
  );
}

function NavLinks({ items, labels, onNavigate, badges }: { items: NavItem[]; labels: string; onNavigate?: () => void; badges?: Record<string, number> }) {
  const pathname = usePathname();
  const active = (it: NavItem) => { const h = it.match ?? it.href; return pathname === h || (h !== "/dashboard" && pathname.startsWith(h + "/")); };
  const link = (it: NavItem) => (
    <Link key={it.href} href={it.href} onClick={onNavigate} title={it.label}
      className={cn("relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
        active(it) ? "bg-white font-medium text-primary-dark" : "text-blue-50 hover:bg-white/10")}>
      <it.icon className="size-[18px] shrink-0" />
      <span className={labels}>{it.label}</span>
      {!!badges?.[it.href] && <span className={cn("ml-auto rounded-full bg-[#ffd400] px-1.5 text-[11px] leading-5 font-bold text-[#073a70] max-lg:absolute max-lg:top-0.5 max-lg:right-0.5 max-lg:ml-0 max-lg:leading-4", "")}>{badges[it.href]}</span>}
    </Link>
  );
  return <>{items.map((it) => (it.children ? <NavGroup key={it.href} item={it} labels={labels} /> : link(it)))}</>;
}

function SidebarBody({ items, labels, onNavigate, badges }: { items: NavItem[]; labels: string; onNavigate?: () => void; badges?: Record<string, number> }) {
  return (
    <>
      <div className="flex items-center gap-3 border-b border-white/15 px-4 py-4">
        <DoanLogo className="h-10 shrink-0 drop-shadow" />
        <div className={cn("min-w-0 leading-tight", labels)}>
          <div className="text-[13px] font-semibold text-white">Trường THPT Sơn Hà</div>
          <div className="text-xs text-blue-100">Đoàn TNCS Hồ Chí Minh</div>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3" aria-label="Điều hướng chính">
        <NavLinks items={[...items.filter((i) => !i.footer), { href: "/settings", label: "Cài đặt", icon: Settings }, ...items.filter((i) => i.footer)]} labels={labels} onNavigate={onNavigate} badges={badges} />
      </nav>
      <div className="space-y-0.5 border-t border-white/15 p-3">
        <LogoutForm variant="sidebar" labelClass={labels} />
      </div>
    </>
  );
}

export function Sidebar({ role, badges }: { role: Role; badges?: Record<string, number> }) {
  // Tablet: thu gọn còn icon. Desktop: đầy đủ. Mobile dùng BottomNav nên không có thanh bên.
  return (
    <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-16 flex-col bg-primary-dark md:flex lg:w-60">
      <SidebarBody items={navFor(role)} labels="hidden lg:inline" badges={badges} />
    </aside>
  );
}
