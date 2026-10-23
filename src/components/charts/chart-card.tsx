import { cn } from "@/utils";

/** Khung chung cho biểu đồ: tiêu đề, dòng mô tả ngắn, nội dung; không có dữ liệu thì hiện lời nhắn thay vì biểu đồ trống. */
export function ChartCard({ title, subtitle, empty, className, children }: { title: string; subtitle?: string; empty?: string; className?: string; children?: React.ReactNode }) {
  return (
    <div className={cn("flex min-w-0 flex-col rounded-lg border border-border bg-white/85 p-4", className)}>
      <h3 className="text-[14px] font-semibold">{title}</h3>
      {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
      <div className="mt-3 flex-1">{empty ? <div className="flex h-44 items-center justify-center text-sm text-muted">{empty}</div> : children}</div>
    </div>
  );
}
