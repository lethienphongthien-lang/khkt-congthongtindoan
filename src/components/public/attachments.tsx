"use client";
import { useState } from "react";
import { Download, Eye, EyeOff, FileSpreadsheet, FileText, Presentation } from "lucide-react";

export type PublicAttachment = { id: string; name: string; url: string; size: number };

const ext = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";
const size = (b: number) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

/** Tải về với đúng tên tệp (Cloudinary: cờ fl_attachment). */
const downloadUrl = (url: string) => url.replace("/upload/", "/upload/fl_attachment/");

/** PDF xem bằng Google viewer; Word/Excel/PowerPoint xem bằng Office Online. Cả hai cần tệp truy cập công khai được. */
function previewUrl(a: PublicAttachment) {
  const e = ext(a.name);
  const src = encodeURIComponent(a.url);
  return e === "pdf" ? `https://docs.google.com/gview?url=${src}&embedded=true` : `https://view.officeapps.live.com/op/embed.aspx?src=${src}`;
}

function Icon({ name }: { name: string }) {
  const e = ext(name);
  if (e === "xls" || e === "xlsx") return <FileSpreadsheet className="size-5 text-emerald-600" />;
  if (e === "ppt" || e === "pptx") return <Presentation className="size-5 text-orange-600" />;
  return <FileText className={e === "pdf" ? "size-5 text-red-600" : "size-5 text-primary"} />;
}

export function Attachments({ files }: { files: PublicAttachment[] }) {
  const [open, setOpen] = useState<string | null>(null);
  if (!files.length) return null;
  return (
    <section className="mt-6">
      <h2 className="mb-2 border-l-4 border-primary pl-3 text-[15px] font-bold tracking-wide text-primary-dark uppercase">Tệp đính kèm</h2>
      <ul className="divide-y divide-border rounded border border-border bg-white/85">
        {files.map((f) => (
          <li key={f.id} className="p-3">
            <div className="flex items-center gap-3">
              <Icon name={f.name} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{f.name}</div>
                <div className="text-xs text-muted">{ext(f.name).toUpperCase()} · {size(f.size)}</div>
              </div>
              <button onClick={() => setOpen(open === f.id ? null : f.id)} className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-border bg-white px-3 text-[13px] hover:bg-slate-50">
                {open === f.id ? <><EyeOff className="size-4" /><span className="max-sm:hidden">Ẩn</span></> : <><Eye className="size-4" /><span className="max-sm:hidden">Xem</span></>}
              </button>
              <a href={downloadUrl(f.url)} className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-primary px-3 text-[13px] text-white hover:bg-primary-dark"><Download className="size-4" /><span className="max-sm:hidden">Tải về</span></a>
            </div>
            {open === f.id && (
              <div className="mt-3">
                <iframe src={previewUrl(f)} title={f.name} className="h-[70vh] w-full rounded-sm border border-border bg-white" loading="lazy" />
                <p className="mt-1 text-xs text-muted">Nếu không hiển thị, hãy dùng nút “Tải về”.</p>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
