import { MoreHorizontal } from "lucide-react";
import { buttonClass } from "@/components/ui/button";

/**
 * Cụm nút thao tác của tiêu đề trang: màn hình rộng hiện trực tiếp, điện thoại gom vào một nút "⋯".
 * Trong menu, nhãn bị ẩn trên mobile (class `max-sm:hidden`) và các nút chỉ có icon (`in-menu`) được hiện lại.
 * Phải truyền cùng `children` cho cả hai nơi nên children là các nút độc lập (mỗi nút tự giữ state).
 */
export function ActionsMenu({ children, label = "Thao tác" }: { children: React.ReactNode; label?: string }) {
  return <>
    <div className="contents max-sm:hidden">{children}</div>
    <details className="relative sm:hidden">
      <summary className={`${buttonClass("secondary")} cursor-pointer list-none`} aria-label={label}><MoreHorizontal className="size-4" /></summary>
      <div className="absolute right-0 z-30 mt-1 flex w-56 flex-col items-stretch gap-0.5 rounded-md border border-border bg-white p-1.5 shadow-lg [&_a]:w-full [&_a]:justify-start [&_button]:w-full [&_button]:justify-start [&_.in-menu]:!inline [&_.max-sm\:hidden]:!inline">{children}</div>
    </details>
  </>;
}
