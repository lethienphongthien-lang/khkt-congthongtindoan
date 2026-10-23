import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { ConfessionActions } from "@/components/confession/review-actions";
import { formatDateTime, str } from "@/utils";
import { cn } from "@/utils";

export const metadata = { title: "Sơn Hà Confession" };

const TABS = [["PENDING", "Chờ duyệt"], ["APPROVED", "Đã duyệt"], ["REJECTED", "Đã từ chối"]] as const;

export default async function ConfessionsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireRole(["ADMIN"]);
  const sp = await searchParams;
  const st = TABS.find((t) => t[0] === str(sp.st))?.[0] ?? "PENDING";
  const [counts, items] = await Promise.all([
    db.confession.groupBy({ by: ["status"], _count: { _all: true } }),
    db.confession.findMany({ where: { status: st }, orderBy: { createdAt: st === "PENDING" ? "asc" : "desc" }, take: 100 }),
  ]);
  const count = (s: string) => counts.find((c) => c.status === s)?._count._all ?? 0;
  return (
    <>
      <PageHeader title="Sơn Hà Confession" description="Ai cũng gửi được confession ẩn danh ở trang công khai. Confession chỉ hiện công khai sau khi Admin hoặc Ban chấp hành duyệt." />
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map(([k, label]) => (
          <Link key={k} href={`/confessions?st=${k}`} className={cn("rounded-full border px-3 py-1 text-sm font-medium", st === k ? "border-primary bg-primary text-white" : "border-border bg-white hover:bg-primary-light")}>
            {label} ({count(k)})
          </Link>
        ))}
        <Link href="/confession" target="_blank" className="ml-auto self-center text-sm text-primary hover:underline">Xem trang công khai</Link>
      </div>
      {items.length === 0 ? <div className="rounded-lg border border-border bg-white/85"><EmptyState title="Không có confession nào" /></div> : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-white/85">
          {items.map((c) => (
            <li key={c.id} className="flex flex-wrap items-start gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="whitespace-pre-wrap break-words text-sm">{c.content}</p>
                <div className="mt-1 text-xs text-muted">{c.nickname ? `${c.nickname} · ` : "Ẩn danh · "}{formatDateTime(c.createdAt)}</div>
              </div>
              <ConfessionActions id={c.id} status={c.status} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
