import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cho phép mở dev server từ điện thoại qua IP mạng LAN (nếu không, trang không "hydrate" và nút không bấm được)
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*"],
  serverExternalPackages: ["@prisma/client", "bcryptjs", "exceljs"],
  images: { remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }] },
  experimental: { staleTimes: { dynamic: 20 }, serverActions: { bodySizeLimit: "6mb" }, optimizePackageImports: ["lucide-react", "recharts"] },
  async headers() {
    return [{ source: "/logo-doan.webp", headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }] }];
  },
};

export default nextConfig;
