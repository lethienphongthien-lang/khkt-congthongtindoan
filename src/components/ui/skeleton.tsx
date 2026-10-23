import { cn } from "@/utils";

export const Skeleton = ({ className, style }: { className?: string; style?: React.CSSProperties }) => <div style={style} className={cn("animate-pulse rounded bg-slate-200/70", className)} />;

/** Khung chờ chung cho trang trong dashboard: tiêu đề, hàng số liệu, bảng. */
export function PageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Đang tải" className="skel-delay">
      <Skeleton className="mb-2 h-6 w-48" />
      <Skeleton className="mb-6 h-4 w-72" />
      <div className="mb-8 grid max-w-xl grid-cols-3 gap-6">
        {[0, 1, 2].map((i) => <div key={i}><Skeleton className="mb-2 h-3 w-16" /><Skeleton className="h-7 w-14" /></div>)}
      </div>
      <div className="overflow-hidden rounded-lg border border-border bg-white/85">
        <Skeleton className="h-10 w-full rounded-none" />
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex items-center gap-6 border-t border-border px-4 py-3.5">
            <Skeleton className="h-4 w-1/3" /><Skeleton className="h-4 w-1/6" /><Skeleton className="h-4 w-1/6" /><Skeleton className="ml-auto h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Khung chờ cho trang biểu mẫu (tạo/sửa): tiêu đề, các ô nhập, ô nội dung lớn, nút. */
export function FormSkeleton() {
  return (
    <div aria-busy="true" aria-label="Đang tải" className="skel-delay w-full">
      <Skeleton className="mb-2 h-6 w-48" />
      <Skeleton className="mb-6 h-4 w-72 max-w-full" />
      <div className="space-y-4">
        <div><Skeleton className="mb-1.5 h-3 w-20" /><Skeleton className="h-9 w-full sm:w-1/2" /></div>
        <div><Skeleton className="mb-1.5 h-3 w-24" /><Skeleton className="h-9 w-full" /></div>
        <div><Skeleton className="mb-1.5 h-3 w-16" /><Skeleton className="h-20 w-full" /></div>
        <div><Skeleton className="mb-1.5 h-3 w-20" /><Skeleton className="h-56 w-full" /></div>
        <div className="flex gap-2"><Skeleton className="h-9 w-32" /><Skeleton className="h-9 w-20" /></div>
      </div>
    </div>
  );
}

/** Khung chờ cho trang chi tiết bài viết/báo cáo: tiêu đề, dòng thông tin, nội dung. */
export function DetailSkeleton() {
  return (
    <div aria-busy="true" aria-label="Đang tải" className="skel-delay w-full">
      <Skeleton className="mb-2 h-7 w-4/5" />
      <Skeleton className="mb-5 h-4 w-60" />
      <Skeleton className="mb-5 h-4 w-3/5" />
      <div className="space-y-2.5">
        {[100, 95, 100, 70, 100, 90, 60].map((w, i) => <Skeleton key={i} className="h-4" style={{ width: `${w}%` }} />)}
      </div>
    </div>
  );
}

/** Khung chờ cho trang soạn trò chơi: cột câu hỏi bên trái, cột thiết lập bên phải. */
export function QuizFormSkeleton() {
  return (
    <div aria-busy="true" aria-label="Đang tải" className="skel-delay w-full">
      <Skeleton className="mb-2 h-6 w-48" />
      <Skeleton className="mb-6 h-4 w-72 max-w-full" />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-3">
          <Skeleton className="h-5 w-40" />
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-16 w-full rounded-xl" />
          <div className="space-y-3 rounded-xl border border-border bg-white/85 p-3">
            {[0, 1, 2, 3].map((i) => <div key={i}><Skeleton className="mb-1.5 h-3 w-20" /><Skeleton className="h-9 w-full" /></div>)}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Khung chờ cho trang công khai: tiêu đề và danh sách bài có ảnh. */
export function PublicSkeleton() {
  return (
    <div aria-busy="true" aria-label="Đang tải" className="skel-delay">
      <Skeleton className="mb-2 h-7 w-56" />
      <Skeleton className="mb-5 h-4 w-80 max-w-full" />
      <div className="rounded border border-border bg-white/85 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-3 border-b border-border py-3 last:border-0">
            <Skeleton className="hidden h-24 w-36 shrink-0 sm:block" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-5 w-4/5" />
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
