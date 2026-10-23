"use client";
import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "./button";

export type UploadedImage = { imageUrl: string; publicId: string } | null;

/** Tải ảnh lên Cloudinary qua API server (secret không bao giờ xuống client). */
export function ImageUpload({ folder, value, onChange, shape = "wide" }: {
  folder: "activities" | "members" | "certificates"; value: UploadedImage; onChange: (v: UploadedImage) => void; shape?: "wide" | "square";
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("folder", folder);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Tải ảnh thất bại");
      onChange(json);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Tải ảnh thất bại");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  const [over, setOver] = useState(false);
  const square = shape === "square";
  const drop = (e: React.DragEvent) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files?.[0]; if (f && f.type.startsWith("image/")) void pick(f); else if (f) toast.error("Chỉ nhận ảnh JPG, PNG hoặc WebP"); };
  return (
    <div className={square ? "w-32" : "w-full"}>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => pick(e.target.files?.[0])} />
      {value ? (
        <div className={`group relative overflow-hidden rounded-lg border border-border bg-slate-50 ${square ? "size-32" : "aspect-video max-h-64 w-full"}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value.imageUrl} alt="Ảnh đã chọn" className="size-full object-cover" />
          <div className="absolute inset-0 flex items-end justify-center gap-1.5 bg-gradient-to-t from-black/55 via-transparent to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100 max-md:opacity-100">
            <Button type="button" size="sm" variant="secondary" loading={busy} onClick={() => input.current?.click()}><ImagePlus className="size-3.5" />Đổi ảnh</Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => onChange(null)}><Trash2 className="size-3.5 text-danger" />Gỡ</Button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => input.current?.click()} disabled={busy}
          onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={drop}
          className={`flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed text-center transition-colors ${square ? "size-32 p-2" : "h-44 w-full p-4"} ${over ? "border-primary bg-primary-light" : "border-border bg-slate-50 hover:border-primary/60 hover:bg-primary-light/50"}`}>
          <span className="flex size-10 items-center justify-center rounded-full bg-white text-primary shadow-sm">{busy ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}</span>
          <span className="text-sm font-medium text-slate-700">{busy ? "Đang tải ảnh..." : square ? "Chọn ảnh" : "Bấm để chọn ảnh hoặc kéo thả vào đây"}</span>
          {!square && <span className="text-xs text-muted">JPG, PNG, WebP · tối đa 5MB</span>}
        </button>
      )}
    </div>
  );
}
