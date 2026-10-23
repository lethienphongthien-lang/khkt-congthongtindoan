"use client";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const KEY = "theme";
const apply = (dark: boolean) => document.documentElement.classList.toggle("dark", dark);

/**
 * Nút đổi sáng/tối cho khu quản trị. Lựa chọn nhớ trong trình duyệt; mặc định theo cài đặt của thiết bị.
 * Khi rời khu quản trị (sang trang công khai) class "dark" được gỡ để trang công khai luôn sáng.
 */
export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    let pref: string | null = null;
    try { pref = localStorage.getItem(KEY); } catch {}
    const d = pref ? pref === "dark" : window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    setDark(d); apply(d);
    return () => { apply(false); };
  }, []);
  useEffect(() => { // đồng bộ khi đổi giao diện từ nơi khác (mục trong menu tài khoản trên điện thoại)
    const sync = () => setDark(document.documentElement.classList.contains("dark"));
    window.addEventListener("themechange", sync);
    return () => window.removeEventListener("themechange", sync);
  }, []);
  const toggle = () => { const d = !dark; setDark(d); apply(d); try { localStorage.setItem(KEY, d ? "dark" : "light"); } catch {} window.dispatchEvent(new Event("themechange")); };
  return (
    <button type="button" onClick={toggle} aria-label={dark ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"} title={dark ? "Giao diện sáng" : "Giao diện tối"}
      className="rounded-md p-2 text-slate-600 hover:bg-slate-100">
      {dark ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
    </button>
  );
}

/** Mục "Giao diện tối/sáng" trong menu tài khoản (dùng trên điện thoại). Cùng nguồn trạng thái với ThemeToggle. */
export function ThemeMenuItem({ onDone }: { onDone?: () => void }) {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const sync = () => setDark(document.documentElement.classList.contains("dark"));
    sync();
    window.addEventListener("themechange", sync);
    return () => window.removeEventListener("themechange", sync);
  }, []);
  const toggle = () => {
    const d = !document.documentElement.classList.contains("dark");
    apply(d); setDark(d);
    try { localStorage.setItem(KEY, d ? "dark" : "light"); } catch {}
    window.dispatchEvent(new Event("themechange"));
    onDone?.();
  };
  return (
    <button type="button" onClick={toggle} className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-slate-50">
      {dark ? <Sun className="size-4 text-muted" /> : <Moon className="size-4 text-muted" />}{dark ? "Giao diện sáng" : "Giao diện tối"}
    </button>
  );
}
