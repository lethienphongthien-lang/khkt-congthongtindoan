"use client";
import { useEffect, useRef, useState } from "react";
import { cdnImage } from "@/lib/image-url";
import { FileSpreadsheet, FileText, Presentation } from "lucide-react";
import { cn } from "@/utils";

export type ThumbSource = { coverUrl: string | null; attachments?: { url: string; name: string }[] };

const ext = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";

/** Ảnh nhỏ cho bài viết: ảnh bìa -> trang đầu của PDF (cắt phần trên) -> biểu tượng loại tệp -> không có. */
export function pickThumb(a: ThumbSource): { src?: string; fileName?: string } | null {
  if (a.coverUrl) return { src: cdnImage(a.coverUrl, 640) };
  const files = a.attachments ?? [];
  const pdf = files.find((f) => ext(f.name) === "pdf" && f.url.includes("/image/upload/"));
  if (pdf) return { src: pdf.url.replace("/image/upload/", "/image/upload/pg_1,w_360,h_270,c_fill,g_north,f_jpg,q_auto:good/").replace(/\.pdf$/i, ".jpg"), fileName: pdf.name };
  return files[0] ? { fileName: files[0].name } : null;
}

function FileTile({ name }: { name: string }) {
  const e = name ? ext(name) : "";
  const Icon = e === "xls" || e === "xlsx" ? FileSpreadsheet : e === "ppt" || e === "pptx" ? Presentation : FileText;
  const color = e === "pdf" ? "text-red-600 bg-red-50" : e.startsWith("xls") ? "text-emerald-600 bg-emerald-50" : e.startsWith("ppt") ? "text-orange-600 bg-orange-50" : "text-primary bg-primary-light";
  return <div className={cn("flex size-full flex-col items-center justify-center gap-0.5", color)}><Icon className="size-1/3" />{name && <span className="text-[10px] font-bold uppercase">{e || "file"}</span>}</div>;
}

export function Thumb({ a, className, always }: { a: ThumbSource; className?: string; /** Bài không có ảnh bìa lẫn tệp (kế hoạch...): vẫn hiện ô biểu tượng để các dòng thẳng hàng */ always?: boolean }) {
  const t = pickThumb(a) ?? (always ? { fileName: "" } : null);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  useEffect(() => { setLoaded(!!(imgRef.current?.complete && imgRef.current.naturalWidth > 0)); }, [t?.src]);
  if (!t) return null;
  return (
    <div className={cn("shrink-0 overflow-hidden rounded-sm border border-border bg-white", t.src && !failed && !loaded && "animate-pulse bg-slate-200/70", className)}>
      {t.src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img ref={imgRef} src={t.src} alt="" loading="lazy" decoding="async" className={cn("size-full object-cover object-top transition duration-300 group-hover:scale-105", loaded ? "opacity-100" : "opacity-0")} onLoad={() => setLoaded(true)} onError={() => setFailed(true)} />
      ) : (
        <FileTile name={t.fileName ?? ""} />
      )}
    </div>
  );
}
