import { Skeleton } from "@/components/ui/skeleton";

/** Khung chờ cho trang xem theo tuần: tiêu đề, hàng chọn năm học/tuần và 7 hàng ngày. */
export function WeekSkeleton() {
  return (
    <div aria-busy="true" aria-label="Đang tải">
      <Skeleton className="mb-2 h-7 w-56" />
      <Skeleton className="mb-5 h-4 w-72 max-w-full" />
      <div className="mb-4 flex flex-wrap gap-2">
        <Skeleton className="h-9 w-full sm:w-44" />
        <Skeleton className="h-9 w-full sm:w-72" />
      </div>
      <div className="overflow-hidden rounded-lg border border-border bg-white/85">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="grid gap-x-4 gap-y-2 border-b border-border px-4 py-3 last:border-0 sm:grid-cols-[9rem_1fr]">
            <Skeleton className="h-5 w-28" />
            <div className="space-y-2"><Skeleton className="h-4 w-4/5" /><Skeleton className="h-3 w-1/3" /></div>
          </div>
        ))}
      </div>
    </div>
  );
}
