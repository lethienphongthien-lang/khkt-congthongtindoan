"use client";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";

/** Thông báo nhỏ (toast) đổi theo chế độ sáng/tối của trang (class "dark" trên <html>). */
export function ThemedToaster() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    const el = document.documentElement;
    const sync = () => setTheme(el.classList.contains("dark") ? "dark" : "light");
    sync();
    const mo = new MutationObserver(sync);
    mo.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => mo.disconnect();
  }, []);
  return <Toaster position="top-right" theme={theme} richColors closeButton toastOptions={{ style: { fontSize: "14px" } }} />;
}
