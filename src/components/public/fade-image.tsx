"use client";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/utils";

/**
 * Ảnh "hiện sau": khung giữ sẵn chỗ (không làm trang giật khi ảnh về) với nền xám nhấp nháy, nội dung chữ hiện trước;
 * ảnh tải xong thì hiện dần. Ảnh đã có sẵn trong bộ nhớ trình duyệt hiện ngay, không nhấp nháy.
 */
export function FadeImage({ src, alt = "", wrapperClassName, className, eager }: { src: string | undefined; alt?: string; wrapperClassName?: string; className?: string; /** Ảnh ở đầu trang: tải ngay (không chờ cuộn tới). */ eager?: boolean }) {
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  useEffect(() => { setLoaded(!!(ref.current?.complete && ref.current.naturalWidth > 0)); }, [src]);
  return (
    <div className={cn("relative overflow-hidden bg-slate-200/70", !loaded && "animate-pulse", wrapperClassName)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={ref} src={src} alt={alt} loading={eager ? "eager" : "lazy"} decoding="async" onLoad={() => setLoaded(true)} onError={() => setLoaded(true)}
        className={cn("size-full object-cover transition-opacity duration-300", loaded ? "opacity-100" : "opacity-0", className)} />
    </div>
  );
}
