import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Đoàn trường THPT Sơn Hà",
    short_name: "Đoàn trường THPT Sơn Hà",
    description: "Quản lý đoàn viên và hoạt động Đoàn - Trường THPT Sơn Hà",
    start_url: "/start.html", // trang khởi động tĩnh (nền xanh) rồi luôn chuyển tới trang chủ công khai
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b63b8",
    theme_color: "#0b63b8",
    lang: "vi",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
