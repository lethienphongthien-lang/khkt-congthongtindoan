import Link from "next/link";
import { cn } from "@/utils";
/** Same horizontal tab pattern as EduConnect; each app retains its own theme colors. */
export function Tabs({ items, current, label = "Các mục" }: { items: readonly (readonly [string,string])[]; current: string; label?: string }) {
  return <nav aria-label={label} className="mb-5 flex min-w-0 overflow-x-auto border-b border-border">
    {items.map(([href,title]) => <Link key={href} href={href} scroll={false} aria-current={current === href ? "page" : undefined} className={cn("-mb-px shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors", current === href ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground")}>{title}</Link>)}
  </nav>;
}
