import Link from "next/link";
import { cn } from "@/utils";

/** Tab điều hướng theo URL (?tab=...): render phía server, chia sẻ link được, cuộn ngang trên mobile. */
export function Tabs({ tabs, active, basePath, param = "tab" }: {
  tabs: { key: string; label: string; icon?: React.ReactNode }[]; active: string; basePath: string; param?: string;
}) {
  return (
    <div role="tablist" className="no-scrollbar -mx-4 mb-5 flex gap-1 overflow-x-auto border-b border-border px-4 sm:mx-0 sm:px-0">
      {tabs.map((t) => {
        const on = t.key === active;
        return (
          <Link key={t.key} role="tab" aria-selected={on} href={t.key === tabs[0].key ? basePath : `${basePath}?${param}=${t.key}`} scroll={false}
            className={cn("-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-sm font-medium whitespace-nowrap transition-colors",
              on ? "border-primary text-primary" : "border-transparent text-muted hover:border-slate-300 hover:text-foreground")}>
            {t.icon}{t.label}
          </Link>
        );
      })}
    </div>
  );
}
