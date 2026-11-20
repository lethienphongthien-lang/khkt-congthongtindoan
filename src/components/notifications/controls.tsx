"use client";
import { BellRing, Share, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/client";
import { useNotify } from "./notification-center";

/** Bật/tắt thông báo đẩy và âm thanh. Dùng trong menu chuông và trang Cài đặt. */
export function NotificationControls({ compact }: { compact?: boolean }) {
  const n = useNotify();
  const t = useT();
  return (
    <div className="space-y-2.5 text-sm">
      {n.needsInstall ? (
        <p className="flex items-start gap-2 text-[13px] text-muted"><Share className="mt-0.5 size-4 shrink-0" />{t("app.notif.ios")}</p>
      ) : n.permission === "unsupported" ? (
        <p className="text-[13px] text-muted">{t("app.notif.unsupported")}</p>
      ) : !n.pushAvailable ? (
        <p className="text-[13px] text-muted">{t("app.notif.noServer")}</p>
      ) : n.permission === "denied" ? (
        <p className="text-[13px] text-warning">{t("app.notif.denied")}</p>
      ) : n.subscribed ? (
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-[13px] text-primary-dark"><BellRing className="size-4" />{t("app.notif.on")}</span>
          <button className="text-[13px] text-muted hover:text-danger" onClick={n.disable}>{t("app.notif.off")}</button>
        </div>
      ) : (
        <Button size="sm" className={compact ? "w-full" : ""} onClick={n.enable}><BellRing className="size-4" />{t("app.notif.enable")}</Button>
      )}
      <label className="flex cursor-pointer items-center justify-between gap-2 text-[13px]">
        <span className="flex items-center gap-1.5"><Volume2 className="size-4 text-muted" />{t("app.notif.sound")}</span>
        <input type="checkbox" checked={n.soundOn} onChange={(e) => { n.setSoundOn(e.target.checked); if (e.target.checked) setTimeout(n.testSound, 50); }} className="size-4 accent-primary" />
      </label>
    </div>
  );
}
