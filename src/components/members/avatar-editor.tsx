"use client";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { updateOwnAvatarAction } from "@/actions/members";
import { Button } from "@/components/ui/button";

export function AvatarEditor({ label = "Đổi ảnh thẻ" }: { label?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function pick(file?: File) {
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("file", file); fd.set("folder", "members");
      const r = await fetch("/api/upload", { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      const res = await updateOwnAvatarAction({ avatarUrl: j.imageUrl, avatarPublicId: j.publicId });
      if (!res.ok) throw new Error(res.error);
      toast.success("Đã cập nhật ảnh");
      router.refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Không tải được ảnh"); }
    finally { setBusy(false); if (ref.current) ref.current.value = ""; }
  }
  return (
    <>
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => pick(e.target.files?.[0])} />
      <Button variant="secondary" size="sm" loading={busy} onClick={() => ref.current?.click()}>{label}</Button>
    </>
  );
}
