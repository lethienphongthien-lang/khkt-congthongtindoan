import type { Metadata, Viewport } from "next";
import { Dancing_Script } from "next/font/google";
import { ThemedToaster } from "@/components/ui/themed-toaster";
import "./globals.css";
import { getLocale, getT } from "@/lib/i18n/server";
import { I18nProvider } from "@/lib/i18n/client";
import { AppSplash, SPLASH_CSS } from "@/components/layout/app-splash";

// Ảnh khởi động iOS (portrait) theo từng cỡ máy: public/splash/<rộng>x<cao>@<tỉ lệ>.png (sinh bằng scripts/gen-splash.mjs)
// Phông chữ viết tay cho khẩu hiệu trên banner (có tiếng Việt)
const script = Dancing_Script({ subsets: ["vietnamese", "latin"], weight: ["600", "700"], variable: "--font-script", display: "swap" });

const IOS_SPLASH: [number, number, number][] = [[430, 932, 3], [393, 852, 3], [428, 926, 3], [390, 844, 3], [375, 812, 3], [414, 896, 3], [414, 896, 2], [414, 736, 3], [375, 667, 2], [320, 568, 2], [834, 1194, 2], [1024, 1366, 2], [810, 1080, 2], [768, 1024, 2]];

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  const name = t("site.name");
  return {
    title: { default: name, template: `%s · ${name}` },
    description: t("site.description"),
    metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
    applicationName: name,
    verification: { google: "Fg3Oycl7XxgnnvqHGpI9FZT2pKd9-GCWZFDALYCVX34" }, // xác minh quyền sở hữu trên Google Search Console
    openGraph: {
      type: "website", locale: locale === "en" ? "en_US" : "vi_VN", siteName: name,
      title: name, description: t("misc.site.ogDesc"),
      images: [{ url: "/icon-512.png", width: 512, height: 512, alt: t("misc.site.ogAlt") }],
    },
    twitter: { card: "summary", title: name, images: ["/icon-512.png"] },
    appleWebApp: {
      capable: true, title: name, statusBarStyle: "default",
      startupImage: IOS_SPLASH.map(([w, h, r]) => ({ url: `/splash/${w}x${h}@${r}.png`, media: `(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${r}) and (orientation: portrait)` })),
    },
  };
}

const THEME_BOOT = `try{var p=location.pathname;if(!(p==="/"||/^\\/(login|forgot-password|change-password|gioi-thieu|ke-hoach|tin-tuc|thong-bao|cau-chuyen-dep|tro-choi|on-thi-gplx|dinh-huong-nghe-nghiep|tai-lieu-sinh-hoat|tinh-nguyen|lich-hoat-dong|lich-cong-tac|bao-cao-chi-doan|thi-dua|bai-viet|tim-kiem|gop-y|confession)(\\/|$)/.test(p))){var t=localStorage.getItem("theme");if(t?t==="dark":matchMedia("(prefers-color-scheme: dark)").matches)document.documentElement.classList.add("dark")}}catch(e){}`;

export const viewport: Viewport = { themeColor: "#0b63b8", viewportFit: "cover", width: "device-width", initialScale: 1, maximumScale: 1, userScalable: false };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={script.variable} suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: SPLASH_CSS }} />
        {/* Chế độ tối chỉ cho khu quản trị: áp dụng trước khi vẽ để không bị nháy sáng; trang công khai và đăng nhập luôn sáng */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body className="font-sans antialiased">
        {/* Màn hình chờ khi mở app đã cài (chỉ hiện ở chế độ standalone); do React quản lý nên gỡ an toàn */}
        <I18nProvider locale={locale}>
          <AppSplash />
          {children}
          <ThemedToaster />
        </I18nProvider>
      </body>
    </html>
  );
}
