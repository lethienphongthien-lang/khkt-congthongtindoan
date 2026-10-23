# Cổng thông tin & quản lý Đoàn – Trường THPT Sơn Hà

Hệ thống web gồm **cổng thông tin công khai** của Đoàn trường và **khu quản trị** quản lý đoàn viên, hoạt động, điểm danh QR, thi đua, trò chơi tích điểm, báo cáo, cùng trợ lý AI. Dùng được trên máy tính và điện thoại (cài như ứng dụng), có chế độ tối.

**Công nghệ:** Next.js 16 (App Router) · React 19 · TypeScript · PostgreSQL + Prisma 6 · Tailwind CSS 4 · Cloudinary · Google Gemini · Vercel.

## Tài liệu

| Tài liệu | Nội dung | Dành cho |
|---|---|---|
| [docs/MO-TA-HE-THONG.md](docs/MO-TA-HE-THONG.md) | Mô tả **chức năng** từng màn hình, quy tắc nghiệp vụ, mô hình dữ liệu | Người dùng, ban giám khảo |
| [docs/SITEMAP.md](docs/SITEMAP.md) | Sơ đồ trang và ma trận phân quyền theo vai trò | Mọi người |
| [docs/KIEN-TRUC-VA-VAN-HANH.md](docs/KIEN-TRUC-VA-VAN-HANH.md) | **Kiến trúc, dịch vụ, biến môi trường, triển khai, cron, xử lý sự cố** | Người vận hành/phát triển |
| [docs/SAO-LUU.md](docs/SAO-LUU.md) | Sao lưu tự động hằng ngày và cách khôi phục | Người vận hành |
| [AGENTS.md](AGENTS.md) | Lưu ý khi viết mã (phiên bản Next.js có thay đổi) | Người/AI viết mã |

## Chạy trên máy cá nhân

```bash
cp .env.example .env     # điền DATABASE_URL, AUTH_SECRET (openssl rand -base64 48), APP_URL, Cloudinary…
npm install
npm run db:push          # tạo/đồng bộ bảng theo prisma/schema.prisma
npm run dev              # http://localhost:3000
```

- Tên và ý nghĩa từng biến môi trường: xem mục 6 của [docs/KIEN-TRUC-VA-VAN-HANH.md](docs/KIEN-TRUC-VA-VAN-HANH.md) và tệp `.env.example`.
- Dữ liệu demo (chỉ dùng cho cơ sở dữ liệu **trống**, không chạy trên dữ liệu thật): `npm run db:seed`. Tài khoản demo xem trong `prisma/seed.ts`.
- Kiểm tra kiểu: `npm run lint` (tức `tsc --noEmit`).
- Máy phát triển thường dùng chung cơ sở dữ liệu thật: khi thử chức năng chỉ dùng dữ liệu có tiền tố "[Test]" và dọn ngay.

## Triển khai và vận hành (tóm tắt)

- Push lên nhánh `main` → Vercel tự build (`prisma generate` → `db push` → khởi tạo cơ sở dữ liệu trống → `next build`) và triển khai.
- Cron hằng ngày (nhắc lịch, chuyển năm học, dọn dữ liệu cũ) khai báo trong `vercel.json`.
- Sao lưu cơ sở dữ liệu mỗi ngày 04:00 (giờ VN) bằng GitHub Actions, mã hóa, giữ 7 bản. Kho GitHub phải để **Private**.
- Chi tiết, kèm bảng xử lý sự cố: [docs/KIEN-TRUC-VA-VAN-HANH.md](docs/KIEN-TRUC-VA-VAN-HANH.md).

## Cấu trúc nhanh

```
src/app/(public)      cổng công khai          src/actions     ghi dữ liệu (Server Actions)
src/app/(dashboard)   khu quản trị            src/lib         xác thực, nghiệp vụ, AI, kiểm tra dữ liệu
src/app/api           tải ảnh, xuất Excel, cron, thông báo đẩy
prisma/               schema, khởi tạo, dữ liệu demo        docs/    tài liệu
```

## Bảo mật

- Phân quyền kiểm tra ở máy chủ cho mọi trang và thao tác; mọi thao tác quan trọng ghi vào **Nhật ký hệ thống**.
- Hồ sơ chi tiết đoàn viên (CCCD, địa chỉ…) chỉ Admin và chính đoàn viên xem được; CCCD hiển thị che.
- Không đưa khóa bí mật (`.env`, khóa API, mật khẩu) vào mã nguồn hay tài liệu.
