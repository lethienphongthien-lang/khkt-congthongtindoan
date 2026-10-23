"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/form";
import { cn } from "@/utils";

export type SettingsItem = { key?: string; label: string; icon?: React.ReactNode; /** Có href: trang quản lý riêng (vẫn hiện trong khung Cài đặt); không có: là một mục ngay trong trang Cài đặt. */ href?: string; hint?: string };
export type SettingsGroup = { title: string; items: SettingsItem[] };

const hrefOf = (i: SettingsItem, first: boolean) => i.href ?? (first ? "/settings" : `/settings?tab=${i.key}`);

/** Điều hướng Cài đặt: cột dọc chia nhóm (máy tính), danh sách chọn (điện thoại). */
export function SettingsNav({ groups }: { groups: SettingsGroup[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const tabParam = useSearchParams().get("tab");
  const items = groups.flatMap((g) => g.items);
  // Mục đang mở: trang Cài đặt theo ?tab=, các trang quản lý theo đường dẫn
  const active = pathname === "/settings"
    ? (items.some((i) => i.key === tabParam) ? tabParam! : "account")
    : items.find((i) => i.href && (pathname === i.href || pathname.startsWith(i.href + "/")))?.href ?? "";
  const firstKey = groups[0]?.items[0]?.key;
  return (
    <>
      {/* điện thoại: một ô chọn gom theo nhóm */}
      <div className="lg:hidden">
        <Select aria-label="Mục cài đặt" value={active} onChange={(e) => { const v = e.target.value; const item = groups.flatMap((g) => g.items).find((i) => (i.key ?? i.href) === v); if (item) router.push(hrefOf(item, item.key === firstKey)); }}>
          {groups.map((g) => (
            <optgroup key={g.title} label={g.title}>
              {g.items.map((i) => <option key={i.key ?? i.href} value={i.key ?? i.href}>{i.label}</option>)}
            </optgroup>
          ))}
        </Select>
      </div>
      {/* máy tính: cột dọc */}
      <nav aria-label="Cài đặt" className="max-lg:hidden">
        <div className="sticky top-16 max-h-[calc(100dvh-5rem)] space-y-4 overflow-y-auto overscroll-contain rounded-lg border border-border bg-white/85 p-2">
          {groups.map((g) => (
            <div key={g.title}>
              <div className="px-2.5 pt-1 pb-1 text-[11px] font-bold tracking-wide text-slate-400 uppercase">{g.title}</div>
              <ul>
                {g.items.map((i) => {
                  const on = (i.key ?? i.href) === active;
                  return (
                    <li key={i.key ?? i.href}>
                      <Link href={hrefOf(i, i.key === firstKey)} scroll={false} aria-current={on ? "page" : undefined}
                        className={cn("flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors", on ? "bg-primary-light font-semibold text-primary-dark" : "text-slate-700 hover:bg-slate-100")}>
                        <span className={cn("shrink-0", on ? "text-primary" : "text-slate-400")}>{i.icon}</span>
                        <span className="min-w-0 flex-1 truncate">{i.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </nav>
    </>
  );
}
