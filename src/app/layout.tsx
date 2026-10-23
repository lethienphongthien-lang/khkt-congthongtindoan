import type { Metadata, Viewport } from "next";
import { Dancing_Script } from "next/font/google";
import { ThemedToaster } from "@/components/ui/themed-toaster";
import "./globals.css";
import { AppSplash, SPLASH_CSS } from "@/components/layout/app-splash";

// Ảnh khởi động iOS (portrait) theo từng cỡ máy: public/splash/<rộng>x<cao>@<tỉ lệ>.png (sinh bằng scripts/gen-splash.mjs)
// Phông chữ viết tay cho khẩu hiệu trên banner (có tiếng Việt)
const script = Dancing_Script({ subsets: ["vietnamese", "latin"], weight: ["600", "700"], variable: "--font-script", display: "swap" });

const IOS_SPLASH: [number, number, number][] = [[430, 932, 3], [393, 852, 3], [428, 926, 3], [390, 844, 3], [375, 812, 3], [414, 896, 3], [414, 896, 2], [414, 736, 3], [375, 667, 2], [320, 568, 2], [834, 1194, 2], [1024, 1366, 2], [810, 1080, 2], [768, 1024, 2]];

export const metadata: Metadata = {
  title: { default: "Đoàn trường THPT Sơn Hà", template: "%s · Đoàn trường THPT Sơn Hà" },
  description: "Cổng thông tin Đoàn TNCS Hồ Chí Minh - Trường THPT Sơn Hà: tin tức, kế hoạch, sự kiện, lịch hoạt động, thi đua và hệ thống quản lý đoàn viên.",
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  applicationName: "Đoàn trường THPT Sơn Hà",
  verification: { google: "Fg3Oycl7XxgnnvqHGpI9FZT2pKd9-GCWZFDALYCVX34" }, // xác minh quyền sở hữu trên Google Search Console
  openGraph: {
    type: "website", locale: "vi_VN", siteName: "Đoàn trường THPT Sơn Hà",
    title: "Đoàn trường THPT Sơn Hà", description: "Cổng thông tin Đoàn TNCS Hồ Chí Minh - Trường THPT Sơn Hà: tin tức, kế hoạch, sự kiện, lịch hoạt động, thi đua.",
    images: [{ url: "/icon-512.png", width: 512, height: 512, alt: "Huy hiệu Đoàn" }],
  },
  twitter: { card: "summary", title: "Đoàn trường THPT Sơn Hà", images: ["/icon-512.png"] },
  appleWebApp: {
    capable: true, title: "Đoàn trường THPT Sơn Hà", statusBarStyle: "default",
    startupImage: IOS_SPLASH.map(([w, h, r]) => ({ url: `/splash/${w}x${h}@${r}.png`, media: `(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${r}) and (orientation: portrait)` })),
  },
};

const THEME_BOOT = `try{var p=location.pathname;if(!(p==="/"||/^\\/(login|forgot-password|change-password|gioi-thieu|ke-hoach|tin-tuc|thong-bao|cau-chuyen-dep|tro-choi|dinh-huong-nghe-nghiep|tai-lieu-sinh-hoat|tinh-nguyen|lich-hoat-dong|lich-cong-tac|bao-cao-chi-doan|thi-dua|bai-viet|tim-kiem|gop-y|confession)(\\/|$)/.test(p))){var t=localStorage.getItem("theme");if(t?t==="dark":matchMedia("(prefers-color-scheme: dark)").matches)document.documentElement.classList.add("dark")}}catch(e){}`;

export const viewport: Viewport = { themeColor: "#0b63b8", viewportFit: "cover", width: "device-width", initialScale: 1, maximumScale: 1, userScalable: false };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={script.variable} suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: SPLASH_CSS }} />
        {/* Chế độ tối chỉ cho khu quản trị: áp dụng trước khi vẽ để không bị nháy sáng; trang công khai và đăng nhập luôn sáng */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body className="font-sans antialiased">
        {/* Màn hình chờ khi mở app đã cài (chỉ hiện ở chế độ standalone); do React quản lý nên gỡ an toàn */}
        <AppSplash />
        {children}
        <ThemedToaster />
      </body>
    </html>
  );
}
