// Sinh ảnh màn hình khởi động (splash) cho iOS: nền xanh Đoàn + huy hiệu + tên hệ thống.
// Chạy: node scripts/gen-splash.mjs  (cần sharp). Ảnh lưu ở public/splash/ và được khai báo trong src/app/layout.tsx.
import sharp from "sharp";

const DEVICES = [
  [430, 932, 3], [393, 852, 3], [428, 926, 3], [390, 844, 3], [375, 812, 3], [414, 896, 3], [414, 896, 2],
  [414, 736, 3], [375, 667, 2], [320, 568, 2], [834, 1194, 2], [1024, 1366, 2], [810, 1080, 2], [768, 1024, 2],
];

for (const [dw, dh, ratio] of DEVICES) {
  const w = dw * ratio, h = dh * ratio;
  const logoH = Math.round(Math.min(w, h) * 0.24);
  const logo = await sharp("public/logo-doan.webp").resize({ height: logoH }).png().toBuffer();
  const lm = await sharp(logo).metadata();
  const fs = Math.round(w * 0.05);
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${Math.round(fs * 3.2)}">
    <text x="50%" y="${Math.round(fs * 1.1)}" text-anchor="middle" font-family="Noto Sans, Arial, sans-serif" font-weight="700" font-size="${fs}" fill="#ffffff">Đoàn trường THPT Sơn Hà</text>
    <text x="50%" y="${Math.round(fs * 2.3)}" text-anchor="middle" font-family="Noto Sans, Arial, sans-serif" font-size="${Math.round(fs * 0.62)}" fill="#cfe3f7">Đoàn TNCS Hồ Chí Minh</text></svg>`);
  const top = Math.round(h / 2 - (lm.height + fs * 3.4) / 2);
  await sharp({ create: { width: w, height: h, channels: 4, background: { r: 11, g: 99, b: 184, alpha: 1 } } })
    .composite([{ input: logo, left: Math.round((w - lm.width) / 2), top }, { input: svg, left: 0, top: top + lm.height + Math.round(fs * 0.9) }])
    .png({ compressionLevel: 9 }).toFile(`public/splash/${dw}x${dh}@${ratio}.png`);
}
console.log("ok", DEVICES.length);
