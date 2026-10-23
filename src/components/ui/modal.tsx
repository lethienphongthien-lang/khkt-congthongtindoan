"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { X } from "lucide-react";
import { cn } from "@/utils";
import { Button } from "./button";

export function Modal({ open, onClose, title, children, className }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode; className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose; // luôn gọi bản onClose mới nhất mà không làm effect bên dưới chạy lại
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeRef.current();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    ref.current?.focus(); // chỉ focus một lần khi hộp thoại mở (trước đây focus lại mỗi lần gõ phím)
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open]);
  if (!open) return null;
  return (
    <div data-no-row className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:items-center" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title}
        className={cn("my-8 w-full max-w-lg rounded-lg bg-white text-left shadow-xl outline-none", className)}>
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded p-1 text-muted hover:bg-slate-100" aria-label="Đóng"><X className="size-4" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

/** Hộp thoại xác nhận (thay cho window.confirm). */
export function ConfirmButton({ trigger, title, description, confirmLabel = "Xác nhận", danger, onConfirm, triggerClassName, triggerVariant = "secondary", size = "sm", triggerLabel }: {
  trigger: React.ReactNode; title: string; description?: React.ReactNode; confirmLabel?: string; danger?: boolean;
  onConfirm: () => Promise<void> | void; triggerClassName?: string; triggerVariant?: "secondary" | "ghost" | "danger" | "primary"; size?: "sm" | "md"; triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <>
      <Button variant={triggerVariant} size={size} className={triggerClassName} aria-label={triggerLabel} title={triggerLabel} onClick={() => setOpen(true)}>{trigger}</Button>
      <Modal open={open} onClose={() => !pending && setOpen(false)} title={title} className="max-w-md">
        {description && <div className="text-sm text-muted">{description}</div>}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>Hủy</Button>
          <Button variant={danger ? "danger" : "primary"} loading={pending}
            onClick={() => start(async () => { await onConfirm(); setOpen(false); })}>{confirmLabel}</Button>
        </div>
      </Modal>
    </>
  );
}
