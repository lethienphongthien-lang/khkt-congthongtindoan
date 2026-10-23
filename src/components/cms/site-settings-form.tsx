"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { saveSiteSettingsAction } from "@/actions/cms";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form";
import { ImageUpload, type UploadedImage } from "@/components/ui/image-upload";

const FIELDS: { key: string; label: string; multiline?: boolean }[] = [
  { key: "address", label: "Địa chỉ" },
  { key: "phone", label: "Số điện thoại liên hệ" },
  { key: "email", label: "Email liên hệ" },
  { key: "facebook", label: "Liên kết Facebook (https://...)" },
  { key: "youtube", label: "Liên kết Youtube (https://...)" },
];

export function SiteSettingsForm({ initial }: { initial: Record<string, string> }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<UploadedImage>(initial.bannerUrl && initial.bannerPublicId ? { imageUrl: initial.bannerUrl, publicId: initial.bannerPublicId } : null);
  return (
    <div className="w-full space-y-4">
      <Field label="Ảnh banner trang chủ" hint="Hiển thị full chiều ngang dưới thanh menu, chỉ ở trang chủ. Nên dùng ảnh ngang tỉ lệ khoảng 8:1 (ví dụ 1920×240), chủ thể ở giữa."><ImageUpload folder="activities" value={banner} onChange={setBanner} /></Field>
      {FIELDS.map((f) => (
        <Field key={f.key} label={f.label}>
          {f.multiline ? <Textarea className="min-h-24" value={v[f.key] ?? ""} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} /> : <Input value={v[f.key] ?? ""} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} />}
        </Field>
      ))}
      <div className="rounded-lg border border-border bg-white/85 p-4">
        <h3 className="mb-1 font-semibold">Đếm ngược sự kiện lớn (trang chủ)</h3>
        <p className="mb-3 text-xs text-muted">Hiện ở đầu trang chủ cho tới khi hết giờ. Để trống tên hoặc thời điểm để ẩn.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tên sự kiện"><Input value={v.countdownTitle ?? ""} maxLength={120} placeholder="Ví dụ: Đại hội Đoàn trường" onChange={(e) => setV({ ...v, countdownTitle: e.target.value })} /></Field>
          <Field label="Thời điểm diễn ra (giờ Việt Nam)"><Input type="datetime-local" value={v.countdownAt ?? ""} onChange={(e) => setV({ ...v, countdownAt: e.target.value })} /></Field>
          <Field label="Liên kết khi bấm (không bắt buộc)" hint="Ví dụ /bai-viet/ten-bai hoặc /su-kien" className="sm:col-span-2"><Input value={v.countdownLink ?? ""} onChange={(e) => setV({ ...v, countdownLink: e.target.value })} /></Field>
        </div>
      </div>
      <Button loading={busy} onClick={async () => {
        setBusy(true); const res = await saveSiteSettingsAction({ ...v, bannerUrl: banner?.imageUrl ?? "", bannerPublicId: banner?.publicId ?? "" }); setBusy(false);
        if (!res.ok) return void toast.error(res.error);
        toast.success(res.message); router.refresh();
      }}>Lưu thông tin</Button>
    </div>
  );
}
