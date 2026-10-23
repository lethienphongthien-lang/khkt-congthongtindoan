// Dựng ảnh nền banner mặc định từ component BannerArt (SVG) -> public/banner-art.webp. Chạy: npx tsx scripts/gen-banner.tsx
import { renderToStaticMarkup } from "react-dom/server";
import sharp from "sharp";
import { BannerArt } from "../src/components/public/banner-art";

(async () => {
  const svg = renderToStaticMarkup(BannerArt());
  await sharp(Buffer.from(svg), { density: 144 }).resize({ width: 3200 }).webp({ quality: 86 }).toFile("public/banner-art.webp");
  console.log("ok", svg.length);
})();
