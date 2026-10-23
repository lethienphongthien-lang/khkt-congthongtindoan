"use client";
import { useEffect, useState } from "react";

/**
 * Màn hình chờ khi mở ứng dụng đã cài lên màn hình chính (PWA): nền xanh Đoàn + huy hiệu + tên hệ thống,
 * hiện ngay từ khung hình đầu tiên (HTML có sẵn, CSS nội tuyến) và mờ dần khi ứng dụng đã sẵn sàng.
 * Chỉ hiện ở chế độ "standalone" (đã cài), trình duyệt thường không thấy.
 */
export function AppSplash() {
  const [hide, setHide] = useState(false); // bắt đầu mờ dần
  const [gone, setGone] = useState(false); // đã gỡ khỏi cây React (không đụng DOM trực tiếp để tránh lỗi khi chuyển trang)
  useEffect(() => {
    const done = () => setHide(true);
    if (document.readyState === "complete") done();
    else window.addEventListener("load", done, { once: true });
    const t = setTimeout(done, 6000); // phòng khi mạng chậm: không chặn màn hình quá 6 giây
    return () => { clearTimeout(t); window.removeEventListener("load", done); };
  }, []);
  useEffect(() => {
    if (!hide) return;
    const t = setTimeout(() => setGone(true), 450);
    return () => clearTimeout(t);
  }, [hide]);
  if (gone) return null;
  return (
    <div id="app-splash" className={hide ? "hide" : undefined} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-doan.webp" alt="" width={102} height={112} />
      <b>Đoàn trường THPT Sơn Hà</b>
      <span>Đoàn TNCS Hồ Chí Minh</span>
      <i />
    </div>
  );
}

export const SPLASH_CSS = `
#app-splash{display:none}
@media (display-mode: standalone){
  html{background:#0b63b8}
  #app-splash{position:fixed;inset:0;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:#0b63b8;color:#fff;text-align:center;transition:opacity .4s ease}
  #app-splash.hide{opacity:0;pointer-events:none}
  #app-splash img{height:112px;width:auto}
  #app-splash b{font-size:20px;font-weight:700;letter-spacing:.2px}
  #app-splash span{font-size:13px;color:#cfe3f7}
  #app-splash img{animation:sp-pulse 1.6s ease-in-out infinite}
  #app-splash i{display:block;margin-top:18px;width:30px;height:30px;border:3px solid rgba(255,255,255,.28);border-top-color:#ffd400;border-radius:50%;animation:sp-spin .8s linear infinite}
}
@keyframes sp-spin{to{transform:rotate(360deg)}}
@keyframes sp-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
@media (prefers-reduced-motion: reduce){#app-splash img,#app-splash i{animation:none}}`;
