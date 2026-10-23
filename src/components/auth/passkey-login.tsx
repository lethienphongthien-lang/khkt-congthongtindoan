"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Fingerprint } from "lucide-react";
import { browserSupportsWebAuthn, startAuthentication } from "@simplewebauthn/browser";
import { finishPasskeyLoginAction, startPasskeyLoginAction } from "@/actions/passkeys";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/misc";

/** Nút "Đăng nhập bằng vân tay / khuôn mặt": chỉ hiện nếu trình duyệt hỗ trợ WebAuthn. */
export function PasskeyLogin({ next }: { next: string }) {
  const router = useRouter();
  const [supported, setSupported] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  useEffect(() => setSupported(browserSupportsWebAuthn()), []);
  if (!supported) return null;

  async function go() {
    setError(undefined); setBusy(true);
    try {
      const start = await startPasskeyLoginAction();
      if (!start.ok || !start.data) throw new Error(start.ok ? "Lỗi" : start.error);
      const assertion = await startAuthentication({ optionsJSON: start.data.options });
      const res = await finishPasskeyLoginAction(assertion);
      if (!res.ok) throw new Error(res.error);
      router.replace(res.data?.mustChangePassword ? "/change-password" : next);
      router.refresh();
    } catch (e) {
      const name = e instanceof Error ? e.name : "";
      if (name !== "NotAllowedError" && name !== "AbortError") setError(e instanceof Error ? e.message : "Không đăng nhập được");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-border" />hoặc<span className="h-px flex-1 bg-border" /></div>
      {error && <Alert>{error}</Alert>}
      <Button type="button" variant="secondary" loading={busy} onClick={go} className="w-full">{!busy && <Fingerprint className="size-4" />}{busy ? "Đang xác thực…" : "Đăng nhập bằng vân tay / khuôn mặt"}</Button>
    </div>
  );
}
