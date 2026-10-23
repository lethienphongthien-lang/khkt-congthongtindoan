"use client";
import { useFormStatus } from "react-dom";
import { Loader2, LogOut } from "lucide-react";
import { logoutAction } from "@/actions/auth";
import { cn } from "@/utils";

const STYLES = {
  sidebar: { btn: "gap-3 rounded-md px-3 py-2 text-sm font-medium text-[#ff9b9b] hover:bg-red-500/20 hover:text-[#ffc2c2]", icon: "size-[18px]" },
  menu: { btn: "gap-2 px-4 py-2 text-sm text-danger hover:bg-danger-light", icon: "size-4" },
  sheet: { btn: "gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-danger active:bg-danger-light", icon: "size-5" },
} as const;

function Inner({ variant, labelClass }: { variant: keyof typeof STYLES; labelClass?: string }) {
  const { pending } = useFormStatus();
  const s = STYLES[variant];
  return (
    <button type="submit" disabled={pending} title="Đăng xuất" aria-busy={pending} className={cn("flex w-full items-center transition-colors disabled:cursor-wait disabled:opacity-80", s.btn)}>
      {pending ? <Loader2 className={cn("shrink-0 animate-spin", s.icon)} /> : <LogOut className={cn("shrink-0", s.icon)} />}
      <span className={labelClass}>{pending ? "Đang đăng xuất…" : "Đăng xuất"}</span>
    </button>
  );
}

/** Nút đăng xuất màu đỏ; bấm vào thì hiện vòng quay và chữ "Đang đăng xuất…" cho tới khi chuyển về trang đăng nhập. */
export function LogoutForm({ variant, labelClass, className }: { variant: keyof typeof STYLES; labelClass?: string; className?: string }) {
  return <form action={logoutAction} className={className}><Inner variant={variant} labelClass={labelClass} /></form>;
}
