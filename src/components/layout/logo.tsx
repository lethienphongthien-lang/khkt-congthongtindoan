import { cn } from "@/utils";

/** Huy hiệu Đoàn TNCS Hồ Chí Minh (public/logo-doan.webp). `className` đặt chiều cao, chiều rộng tự theo tỷ lệ ảnh. */
export function DoanLogo({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/logo-doan.webp" alt="Huy hiệu Đoàn TNCS Hồ Chí Minh" width={360} height={396} className={cn("h-10 w-auto object-contain", className)} />
  );
}
