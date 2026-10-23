"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type PermissionState = NotificationPermission | "unsupported";

type Ctx = {
  permission: PermissionState;
  subscribed: boolean;
  needsInstall: boolean; // iOS Safari: chỉ nhận push khi đã thêm vào Màn hình chính
  pushAvailable: boolean; // máy chủ đã cấu hình VAPID
  soundOn: boolean;
  setSoundOn: (v: boolean) => void;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
  testSound: () => void;
};

const NotifyContext = createContext<Ctx | null>(null);
export const useNotify = () => {
  const c = useContext(NotifyContext);
  if (!c) throw new Error("useNotify phải nằm trong NotificationProvider");
  return c;
};

const POLL_MS = 30_000;
const SOUND_KEY = "doan:sound";

function urlBase64ToUint8Array(input: string) {
  const b64 = input.replace(/[^A-Za-z0-9\-_+/]/g, ""); // bỏ ký tự lạ (khoảng trắng, dấu nháy, "=") để atob không báo lỗi
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error("Không lưu được đăng ký thông báo");
}

export function NotificationProvider({ publicKey, latestId, children }: { publicKey: string | null; latestId: string | null; children: React.ReactNode }) {
  const router = useRouter();
  const [permission, setPermission] = useState<PermissionState>("unsupported");
  const [subscribed, setSubscribed] = useState(false);
  const [needsInstall, setNeedsInstall] = useState(false);
  const [soundOn, setSoundOnState] = useState(true);
  const audio = useRef<HTMLAudioElement | null>(null);
  const lastId = useRef<string | null>(latestId);
  const soundRef = useRef(true);

  const playSound = useCallback(() => {
    if (!soundRef.current) return;
    audio.current ??= new Audio("/notify.wav");
    audio.current.currentTime = 0;
    audio.current.play().catch(() => {}); // trình duyệt chặn nếu người dùng chưa tương tác với trang
  }, []);

  const setSoundOn = useCallback((v: boolean) => {
    soundRef.current = v;
    setSoundOnState(v);
    try { localStorage.setItem(SOUND_KEY, v ? "1" : "0"); } catch {}
  }, []);

  // Khởi tạo: âm thanh, quyền, service worker, đăng ký hiện có.
  useEffect(() => {
    try { const v = localStorage.getItem(SOUND_KEY) !== "0"; soundRef.current = v; setSoundOnState(v); } catch {}
    const ua = navigator.userAgent;
    const ios = /iphone|ipad|ipod/i.test(ua);
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setNeedsInstall(ios && !standalone && !supported);
    if (!supported) return;
    setPermission(Notification.permission);
    navigator.serviceWorker.register("/sw.js").then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setSubscribed(!!sub);
      if (sub && Notification.permission === "granted") postJson("/api/push/subscribe", sub.toJSON()).catch(() => {}); // đồng bộ lại (đổi tài khoản trên cùng máy)
    }).catch(() => {});
  }, []);

  // Có thông báo mới? -> âm thanh + toast + làm mới dữ liệu.
  const poll = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/poll", { cache: "no-store" });
      if (!res.ok) return;
      const { latest } = (await res.json()) as { unread: number; latest: { id: string; title: string; body: string | null } | null };
      if (latest && latest.id !== lastId.current) {
        lastId.current = latest.id;
        {
          playSound();
          toast(latest.title, { description: latest.body ?? undefined });
          router.refresh();
        }
      }
    } catch {}
  }, [playSound, router]);

  useEffect(() => {
    const tick = () => { if (document.visibilityState === "visible") void poll(); };
    const t = setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    const onMsg = (e: MessageEvent) => { if (e.data?.type === "push") void poll(); };
    navigator.serviceWorker?.addEventListener("message", onMsg);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", tick); navigator.serviceWorker?.removeEventListener("message", onMsg); };
  }, [poll]);

  const enable = useCallback(async () => {
    if (!publicKey) return void toast.error("Máy chủ chưa cấu hình thông báo đẩy");
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") return void toast.error("Bạn chưa cho phép thông báo");
      const reg = await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) }));
      await postJson("/api/push/subscribe", sub.toJSON());
      setSubscribed(true);
      toast.success("Đã bật thông báo đẩy");
      playSound();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Không bật được thông báo");
    }
  }, [publicKey, playSound]);

  const disable = useCallback(async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) { await postJson("/api/push/unsubscribe", { endpoint: sub.endpoint }).catch(() => {}); await sub.unsubscribe(); }
      setSubscribed(false);
      toast.success("Đã tắt thông báo đẩy trên thiết bị này");
    } catch { toast.error("Không tắt được thông báo"); }
  }, []);

  const value = useMemo<Ctx>(() => ({
    permission, subscribed, needsInstall, pushAvailable: !!publicKey, soundOn, setSoundOn, enable, disable, testSound: playSound,
  }), [permission, subscribed, needsInstall, publicKey, soundOn, setSoundOn, enable, disable, playSound]);

  return <NotifyContext.Provider value={value}>{children}</NotifyContext.Provider>;
}
