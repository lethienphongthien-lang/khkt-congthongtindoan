"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronDown, FileText, Folder } from "lucide-react";
import type { MenuConfig } from "@/lib/menu-config";
import { cn } from "@/utils";

export type SidebarDept = { id: string; name: string };
export type SidebarGrade = { grade: string; depts: SidebarDept[] };

/** Nhóm menu luôn mở sẵn ở mọi trang (người dùng vẫn có thể thu gọn thủ công). */
function Group({ title, icon: Icon, children }: { title: string; icon: typeof Folder; open?: boolean; children: React.ReactNode }) {
  return (
    <details open className="group">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-sm px-1 py-[3px] text-[13px] font-semibold tracking-wide text-primary-dark uppercase hover:bg-primary-light/60 [&::-webkit-details-marker]:hidden">
        <Icon className="size-4 text-primary" />{title}<ChevronDown className="ml-auto size-4 text-slate-400 transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-0 mb-0.5 ml-[0.75rem] border-l border-slate-200 pl-0.5">{children}</div>
    </details>
  );
}

const itemClass = (active: boolean) => cn("-ml-px block rounded-r-sm border-l-[3px] border-transparent py-0.5 pr-1 pl-1 text-sm text-slate-600 transition-colors hover:bg-primary-light/60 hover:text-primary-dark", active && "border-primary bg-primary-light/70 font-medium text-primary-dark");

/** Thanh bên trái của trang công khai: các nhóm do Admin sắp xếp (mặc định Giới thiệu / Báo cáo Chi đoàn / Góc học sinh / Thi đua). */
export function PublicSidebar({ grades, menu }: { grades: SidebarGrade[]; menu: MenuConfig }) {
  const pathname = usePathname();
  const khoi = useSearchParams().get("khoi");
  const inReports = pathname.startsWith("/bao-cao-chi-doan");
  return (
    <nav aria-label="Danh mục" className="space-y-0.5 rounded bg-white/70 p-[3px] shadow-sm">
      {menu.side.filter((g) => !g.hidden).map((g) => g.kind === "reports" ? (
        <Group key={g.id} title={g.title} icon={FileText}>
          {grades.length === 0 && <p className="px-3 py-1.5 text-sm text-muted">Chưa có Chi đoàn</p>}
          {grades.map((gr) => (
            <details key={gr.grade} open={inReports && (khoi === gr.grade || gr.depts.some((d) => pathname.includes(d.id)))} className="group/sub">
              <summary className="flex cursor-pointer list-none items-center gap-1 rounded-sm py-0.5 pr-1 pl-1 text-sm font-medium text-slate-700 hover:bg-primary-light/60 [&::-webkit-details-marker]:hidden">
                <ChevronDown className="size-3.5 -rotate-90 transition-transform group-open/sub:rotate-0" />{gr.grade === "gv" ? "Chi đoàn giáo viên" : `Khối ${gr.grade}`}
              </summary>
              <div className="grid grid-cols-3 gap-0.5 pr-1 pb-0.5 pl-3">
                {gr.depts.map((d) => (
                  <Link key={d.id} href={`/bao-cao-chi-doan/${d.id}`} className={cn("rounded px-1.5 py-1 text-center text-[13px] text-slate-600 hover:bg-primary-light/70 hover:text-primary-dark", pathname.includes(d.id) && "bg-primary text-white hover:bg-primary hover:text-white")}>{d.name}</Link>
                ))}
              </div>
            </details>
          ))}
        </Group>
      ) : (
        <Group key={g.id} title={g.title} icon={Folder}>
          {g.items.filter((i) => !i.hidden).map((i) => /^https:/.test(i.href)
            ? <a key={i.id} href={i.href} target="_blank" rel="noopener noreferrer" className={itemClass(false)}>{i.label}</a>
            : <Link key={i.id} href={i.href} className={itemClass(pathname === i.href)}>{i.label}</Link>)}
        </Group>
      ))}
    </nav>
  );
}
