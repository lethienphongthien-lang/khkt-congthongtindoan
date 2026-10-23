"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Avatar } from "@/components/ui/misc";
import { DoanLogo } from "@/components/layout/logo";

/** Thẻ đoàn viên số. QR chỉ chứa token ngẫu nhiên, không chứa thông tin cá nhân. */
export function MemberCard({ fullName, code, department, className, avatarUrl, qrToken, doanVien = true }: {
  fullName: string; code: string; department: string; className: string; avatarUrl: string | null; qrToken: string; doanVien?: boolean;
}) {
  const [qr, setQr] = useState("");
  useEffect(() => { QRCode.toDataURL(`doan:${qrToken}`, { margin: 1, width: 240, color: { dark: "#084a8c" } }).then(setQr); }, [qrToken]);
  return (
    <div className="w-full max-w-sm overflow-hidden rounded-lg border border-border bg-white/85">
      <div className="flex items-center gap-2.5 bg-primary px-4 py-2.5 text-white">
        <span className="flex items-center rounded bg-white/85 p-1"><DoanLogo className="h-7" /></span>
        <div className="leading-tight">
          <div className="text-[11px] tracking-wide uppercase opacity-90">Đoàn TNCS Hồ Chí Minh</div>
          <div className="text-[13px] font-semibold">{doanVien ? "Thẻ đoàn viên" : "Thẻ thanh niên"} · THPT Sơn Hà</div>
        </div>
      </div>
      <div className="flex items-center gap-4 p-4">
        <div className="min-w-0 flex-1 space-y-2">
          <Avatar name={fullName} src={avatarUrl} size={56} />
          <div>
            <div className="font-semibold">{fullName}</div>
            <div className="font-mono text-[13px] text-muted">{code}</div>
            <div className="text-[13px]">Chi đoàn {department}</div>
          </div>
        </div>
        {qr && /* eslint-disable-next-line @next/next/no-img-element */ <img src={qr} alt="Mã QR cá nhân" className="size-28 shrink-0" />}
      </div>
    </div>
  );
}
