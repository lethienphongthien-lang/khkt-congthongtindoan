"use client";
import { useRef, useState } from "react";
import { FileText, Loader2, Paperclip, X } from "lucide-react";
import { toast } from "sonner";

export type AttachmentValue = { name: string; url: string; publicId: string; size: number; mime?: string };

export const formatSize = (b: number) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

/** Chọn nhiều tệp tài liệu (PDF/Word/Excel/PowerPoint) và tải lên qua API server. */
export function FileUpload({ value, onChange, max = 10 }: { value: AttachmentValue[]; onChange: (v: AttachmentValue[]) => void; max?: number }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function pick(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    const added: AttachmentValue[] = [];
    for (const file of Array.from(files)) {
      if (value.length + added.length >= max) { toast.error(`Tối đa ${max} tệp`); break; }
      try {
        const fd = new FormData();
        fd.set("file", file); fd.set("folder", "documents");
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Tải tệp thất bại");
        added.push(json);
      } catch (e) {
        toast.error(`${file.name}: ${e instanceof Error ? e.message : "Tải tệp thất bại"}`);
      }
    }
    if (added.length) onChange([...value, ...added]);
    setBusy(false);
    if (input.current) input.current.value = "";
  }

  const [over, setOver] = useState(false);
  const full = value.length >= max;
  return (
    <div className="space-y-2">
      <input ref={input} type="file" multiple hidden accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" onChange={(e) => pick(e.target.files)} />
      <button type="button" disabled={busy || full} onClick={() => input.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); void pick(e.dataTransfer.files); }}
        className={`flex h-44 w-full flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed px-4 text-center transition-colors disabled:opacity-60 ${over ? "border-primary bg-primary-light" : "border-border bg-slate-50 hover:border-primary/60 hover:bg-primary-light/50"}`}>
        <span className="flex size-10 items-center justify-center rounded-full bg-white text-primary shadow-sm">{busy ? <Loader2 className="size-5 animate-spin" /> : <Paperclip className="size-5" />}</span>
        <span className="text-sm font-medium text-slate-700">{busy ? "Đang tải tệp..." : full ? `Đã đủ ${max} tệp` : "Bấm để chọn tệp hoặc kéo thả vào đây"}</span>
        <span className="text-xs text-muted">PDF, Word, Excel, PowerPoint · tối đa 10MB mỗi tệp · tối đa {max} tệp</span>
      </button>
      {value.length > 0 && (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-white/85">
          {value.map((f) => {
            const e = f.name.split(".").pop()?.toLowerCase() ?? "";
            const tone = e === "pdf" ? "bg-red-50 text-red-600" : e.startsWith("xls") ? "bg-emerald-50 text-emerald-600" : e.startsWith("ppt") ? "bg-orange-50 text-orange-600" : "bg-blue-50 text-blue-600";
            return (
              <li key={f.publicId} className="flex items-center gap-3 px-3 py-2 text-sm">
                <span className={`flex size-9 shrink-0 flex-col items-center justify-center rounded-md text-[10px] leading-none font-bold uppercase ${tone}`}><FileText className="mb-0.5 size-4" />{e || "tệp"}</span>
                <span className="min-w-0 flex-1"><span className="block truncate font-medium">{f.name}</span><span className="text-xs text-muted">{formatSize(f.size)}</span></span>
                <button type="button" onClick={() => onChange(value.filter((x) => x.publicId !== f.publicId))} className="rounded-md p-1.5 text-muted hover:bg-slate-100 hover:text-danger" aria-label={`Gỡ ${f.name}`}><X className="size-4" /></button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
