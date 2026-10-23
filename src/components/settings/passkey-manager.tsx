"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Fingerprint, Plus, Smartphone, Trash2 } from "lucide-react";
import { browserSupportsWebAuthn, startRegistration } from "@simplewebauthn/browser";
import { deletePasskeyAction, finishPasskeyRegistrationAction, startPasskeyRegistrationAction } from "@/actions/passkeys";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/modal";
import { Alert } from "@/components/ui/misc";
import { reportResult } from "@/components/ui/submit";

type Item = { id: string; deviceName: string | null; createdAt: string; lastUsedAt: string | null };

const fmt = (iso: string) => new Date(iso).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "short" });

function guessDevice() {
  const ua = navigator.userAgent;
  if (/iphone/i.test(ua)) return "iPhone";
  if (/ipad/i.test(ua)) return "iPad";
  if (/android/i.test(ua)) return "Điện thoại Android";
  if (/windows/i.test(ua)) return "Máy tính Windows";
  if (/macintosh|mac os/i.test(ua)) return "Máy Mac";
  if (/linux/i.test(ua)) return "Máy tính Linux";
  return "Thiết bị của tôi";
}

export function PasskeyManager({ items }: { items: Item[] }) {
  const router = useRouter();
  const [supported, setSupported] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  useEffect(() => setSupported(browserSupportsWebAuthn()), []);

  async function add() {
    setError(undefined); setBusy(true);
    try {
      const start = await startPasskeyRegistrationAction();
      if (!start.ok || !start.data) throw new Error(start.ok ? "Lỗi" : start.error);
      const attestation = await startRegistration({ optionsJSON: start.data.options });
      const res = await finishPasskeyRegistrationAction(attestation, guessDevice());
      if (!reportResult(res)) return;
      router.refresh();
    } catch (e) {
      const name = e instanceof Error ? e.name : "";
      if (name === "InvalidStateError") setError("Thiết bị này đã được bật đăng nhập nhanh rồi.");
      else if (name !== "NotAllowedError" && name !== "AbortError") setError(e instanceof Error ? e.message : "Không bật được đăng nhập nhanh");
    } finally { setBusy(false); }
  }

  return (
    <div className="max-w-xl space-y-4">
      <p className="text-sm text-muted">Bật đăng nhập bằng <b>vân tay, khuôn mặt hoặc mã khóa màn hình</b> của điện thoại/máy tính. Lần sau bạn không cần nhớ mật khẩu. Dữ liệu sinh trắc học không được gửi đi, chỉ nằm trong thiết bị của bạn.</p>
      {supported === false && <Alert tone="amber">Trình duyệt hoặc thiết bị này chưa hỗ trợ đăng nhập nhanh. Hãy dùng Chrome, Safari hoặc Edge bản mới, trên địa chỉ HTTPS.</Alert>}
      {error && <Alert>{error}</Alert>}
      <Button loading={busy} disabled={supported === false} onClick={add}><Plus className="size-4" />Bật trên thiết bị này</Button>

      <div>
        <h3 className="mb-2 text-[15px] font-semibold">Thiết bị đã bật ({items.length})</h3>
        {items.length === 0 ? (
          <div className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-white/70 px-4 py-6 text-sm text-muted"><Fingerprint className="size-5" />Chưa có thiết bị nào.</div>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border bg-white/85">
            {items.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                <Smartphone className="size-5 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{p.deviceName ?? "Thiết bị"}</div>
                  <div className="text-xs text-muted">Thêm {fmt(p.createdAt)}{p.lastUsedAt ? ` · dùng gần nhất ${fmt(p.lastUsedAt)}` : " · chưa dùng"}</div>
                </div>
                <ConfirmButton triggerVariant="ghost" triggerClassName="text-danger" triggerLabel="Xóa" trigger={<Trash2 className="size-4" />} title="Xóa thiết bị này?" danger confirmLabel="Xóa"
                  description="Thiết bị sẽ không đăng nhập nhanh được nữa (vẫn đăng nhập bằng mật khẩu)."
                  onConfirm={async () => { reportResult(await deletePasskeyAction(p.id)); router.refresh(); }} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
