"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n/config";
import { Fingerprint, Plus, Smartphone, Trash2 } from "lucide-react";
import { browserSupportsWebAuthn, startRegistration } from "@simplewebauthn/browser";
import { deletePasskeyAction, finishPasskeyRegistrationAction, startPasskeyRegistrationAction } from "@/actions/passkeys";
import { useT } from "@/lib/i18n/client";
import { intlLocale } from "@/lib/i18n/format";
import { useLocale } from "@/lib/i18n/client";
import type { TFn } from "@/lib/i18n/translate";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/modal";
import { Alert } from "@/components/ui/misc";
import { reportResult } from "@/components/ui/submit";

type Item = { id: string; deviceName: string | null; createdAt: string; lastUsedAt: string | null };

const fmt = (iso: string, locale: Locale) => new Date(iso).toLocaleString(intlLocale(locale), { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "short" });

function guessDevice(t: TFn) {
  const ua = navigator.userAgent;
  if (/iphone/i.test(ua)) return "iPhone";
  if (/ipad/i.test(ua)) return "iPad";
  if (/android/i.test(ua)) return t("ui.pk.android");
  if (/windows/i.test(ua)) return t("ui.pk.windows");
  if (/macintosh|mac os/i.test(ua)) return t("ui.pk.mac");
  if (/linux/i.test(ua)) return t("ui.pk.linux");
  return t("ui.pk.mine");
}

export function PasskeyManager({ items }: { items: Item[] }) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [supported, setSupported] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  useEffect(() => setSupported(browserSupportsWebAuthn()), []);

  async function add() {
    setError(undefined); setBusy(true);
    try {
      const start = await startPasskeyRegistrationAction();
      if (!start.ok || !start.data) throw new Error(start.ok ? t("ui.pk.errShort") : start.error);
      const attestation = await startRegistration({ optionsJSON: start.data.options });
      const res = await finishPasskeyRegistrationAction(attestation, guessDevice(t));
      if (!reportResult(res)) return;
      router.refresh();
    } catch (e) {
      const name = e instanceof Error ? e.name : "";
      if (name === "InvalidStateError") setError(t("ui.pk.already"));
      else if (name !== "NotAllowedError" && name !== "AbortError") setError(e instanceof Error ? e.message : t("ui.pk.fail"));
    } finally { setBusy(false); }
  }

  return (
    <div className="max-w-xl space-y-4">
      <p className="text-sm text-muted">{t("ui.pk.intro1")}<b>{t("ui.pk.intro2")}</b>{t("ui.pk.intro3")}</p>
      {supported === false && <Alert tone="amber">{t("ui.pk.unsupported")}</Alert>}
      {error && <Alert>{error}</Alert>}
      <Button loading={busy} disabled={supported === false} onClick={add}><Plus className="size-4" />{t("ui.pk.enable")}</Button>

      <div>
        <h3 className="mb-2 text-[15px] font-semibold">{t("ui.pk.devices", { n: items.length })}</h3>
        {items.length === 0 ? (
          <div className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-white/70 px-4 py-6 text-sm text-muted"><Fingerprint className="size-5" />{t("ui.pk.none")}</div>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border bg-white/85">
            {items.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                <Smartphone className="size-5 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{p.deviceName ?? t("ui.pk.device")}</div>
                  <div className="text-xs text-muted">{t("ui.pk.added", { d: fmt(p.createdAt, locale) })}{p.lastUsedAt ? t("ui.pk.lastUsed", { d: fmt(p.lastUsedAt, locale) }) : t("ui.pk.neverUsed")}</div>
                </div>
                <ConfirmButton triggerVariant="ghost" triggerClassName="text-danger" triggerLabel={t("ui.pk.delete")} trigger={<Trash2 className="size-4" />} title={t("ui.pk.delTitle")} danger confirmLabel={t("ui.pk.delete")}
                  description={t("ui.pk.delDesc")}
                  onConfirm={async () => { reportResult(await deletePasskeyAction(p.id)); router.refresh(); }} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
