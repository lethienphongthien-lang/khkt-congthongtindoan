# Kiến trúc và vận hành hệ thống

Tài liệu cho người tiếp tục phát triển/vận hành hệ thống **Cổng thông tin & quản lý Đoàn – Trường THPT Sơn Hà**. Đọc cùng với:
- `docs/MO-TA-HE-THONG.md`: mô tả **chức năng** từng màn hình (dành cho người dùng/người chấm).
- `docs/SITEMAP.md`: sơ đồ trang và phân quyền.
- `docs/SAO-LUU.md`: thiết lập và khôi phục sao lưu.

> Tài liệu này **không chứa khóa bí mật**. Giá trị thật của biến môi trường nằm ở tệp `.env` (máy cá nhân), Vercel (Environment Variables) và GitHub (Secrets).

---

## 1. Tổng quan

Một ứng dụng web duy nhất gồm hai phần dùng chung cơ sở dữ liệu: **cổng công khai** (không đăng nhập) và **khu quản trị** (đăng nhập theo vai trò Admin/Ban chấp hành, Bí thư, Đoàn viên).

```
 Người dùng (trình duyệt / PWA / điện thoại)
        │  HTTPS
        ▼
 ┌─────────────────────────── Vercel (hosting, vùng Singapore sin1) ───────────────────────────┐
 │  Next.js 16 (App Router, React 19)                                                           │
 │   ├─ Trang công khai   (public)   : tin tức, sự kiện, thi đua, chatbot…                      │
 │   ├─ Khu quản trị      (dashboard): đoàn viên, hoạt động, báo cáo, CMS, cài đặt…             │
 │   ├─ Server Actions    (src/actions) : ghi dữ liệu, kiểm tra quyền, ghi nhật ký              │
 │   ├─ API routes        (src/app/api) : tải ảnh, xuất Excel, thông báo đẩy, cron…             │
 │   └─ proxy.ts          : chặn nhanh người chưa đăng nhập                                     │
 └──────┬──────────────┬───────────────┬────────────────┬──────────────────┬───────────────────┘
        │ Prisma       │ HTTPS API     │ HTTPS API      │ Web Push         │ Cron (vercel.json)
        ▼              ▼               ▼                ▼                  ▼
  PostgreSQL        Cloudinary     Google Gemini    Dịch vụ push của   3 tác vụ hằng ngày
  (Prisma Postgres) (ảnh, tệp)     (AI, chatbot)    trình duyệt        (nhắc lịch, năm học, dọn dẹp)

 GitHub (mã nguồn) ──push main──► Vercel tự build và triển khai
 GitHub Actions ───mỗi ngày 04:00 (giờ VN)──► sao lưu cơ sở dữ liệu (mã hóa, giữ 7 bản)
```

## 2. Công nghệ

| Thành phần | Công nghệ |
|---|---|
| Khung ứng dụng | Next.js 16 (App Router, Server Components, Server Actions), React 19, TypeScript |
| Giao diện | Tailwind CSS v4, lucide-react (biểu tượng), sonner (thông báo nhỏ), Recharts (biểu đồ), TipTap (trình soạn thảo) |
| Dữ liệu | PostgreSQL qua Prisma 6 (`prisma/schema.prisma`) |
| Xác thực | Mật khẩu (bcrypt) + phiên JWT trong cookie `doan_session` (thư viện `jose`); đăng nhập vân tay/khuôn mặt (WebAuthn, `@simplewebauthn`) |
| Kiểm tra dữ liệu | Zod (`src/lib/validation`) |
| Tệp, ảnh | Cloudinary |
| AI | Google Gemini (REST) |
| Thông báo đẩy | Web Push (`web-push`, khóa VAPID) + service worker `public/sw.js` |
| Excel, PDF, QR | `exceljs`, `pdf-lib`, `qrcode`, `jsqr` (quét QR) |
| Làm sạch nội dung | `sanitize-html` |

> **Lưu ý:** dự án dùng phiên bản Next.js có khác biệt so với tài liệu cũ. Trước khi viết mã mới, đọc tài liệu đi kèm trong `node_modules/next/dist/docs/` (xem `AGENTS.md`).

## 3. Cấu trúc thư mục

```
src/
├─ app/
│   ├─ (public)/      Cổng công khai (tin-tuc, su-kien, thi-dua, tro-choi, gop-y…)
│   ├─ (auth)/        login, forgot-password, change-password
│   ├─ (dashboard)/   Khu quản trị (members, departments, activities, reports, cms, settings, audit…)
│   ├─ api/           upload, members/export, reports/export, notifications, push, cron/*, admin-units
│   ├─ sitemap.ts, robots.ts, indexnow.txt/   SEO
│   └─ layout.tsx     Bố cục gốc, xác minh Google, giao diện sáng/tối
├─ actions/           Server Actions theo nhóm (members, activities, cms, games, ai, chat…)
├─ components/        Thành phần giao diện (ui/, layout/, members/, cms/, charts/, games/, public/…)
├─ lib/
│   ├─ auth/          phiên, mật khẩu, quyền
│   ├─ services/      truy vấn và nghiệp vụ dùng lại (queries, stats, reports, overview…)
│   ├─ ai/            gọi Gemini, hạn mức, câu lệnh mẫu
│   ├─ validation/    lược đồ Zod
│   ├─ db/            khởi tạo Prisma Client
│   └─ audit.ts, push.ts, seo.ts, site-url.ts, nav.ts…
├─ data/              Danh mục đơn vị hành chính (34 tỉnh/thành, xã/phường)
└─ proxy.ts           Chặn người chưa đăng nhập; liệt kê đường dẫn công khai
prisma/               schema.prisma, bootstrap.ts (khởi tạo DB trống), seed.ts (dữ liệu demo)
scripts/              db-push.mjs, restore-backup.sh, tạo ảnh splash/banner
.github/workflows/    db-backup.yml (sao lưu hằng ngày)
public/               ảnh, biểu tượng PWA, sw.js
vercel.json           vùng chạy và lịch cron
```

## 4. Phân quyền

Ba vai trò (`Role`): **ADMIN** (gồm Quản trị hệ thống và các tài khoản Ban chấp hành), **SECRETARY** (Bí thư Chi đoàn, giới hạn trong Chi đoàn mình), **MEMBER** (đoàn viên/thanh niên).
- Lớp chặn nhanh: `src/proxy.ts` chuyển người chưa có cookie phiên về `/login`. **Đây chỉ là lớp tiện lợi**, không phải bảo mật thật.
- Bảo mật thật: mọi trang và Server Action tự kiểm tra bằng `requireUser` / `requireRole`, và truy vấn luôn lọc theo phạm vi quyền (`memberScope`, `activityScope`…).
- **Quy tắc khi thêm trang công khai mới:** thêm tiền tố đường dẫn vào `PUBLIC_PREFIXES` trong `proxy.ts`, nếu không trang sẽ bị chuyển về đăng nhập.
- Dữ liệu nhạy cảm (hồ sơ chi tiết: CCCD, địa chỉ…) chỉ Admin và chính đoàn viên xem được; CCCD hiển thị che.
- Mọi thao tác quan trọng ghi vào bảng nhật ký (`AuditLog`), xem ở **Nhật ký hệ thống** (chỉ quản trị).

## 5. Dịch vụ bên ngoài

| Dịch vụ | Dùng để | Quản lý ở đâu | Ghi chú |
|---|---|---|---|
| **Vercel** | Chạy web, tự triển khai khi push `main`, cron | vercel.com → dự án `doan-thanh-nien` | Gói miễn phí có hạn mức (xem mục 11) |
| **Prisma Postgres** | Cơ sở dữ liệu PostgreSQL (máy chủ `db.prisma.io`) | Bảng điều khiển Prisma | Chưa xác nhận gói hiện tại có sao lưu sẵn → dùng sao lưu riêng của dự án (mục 9) |
| **Cloudinary** | Lưu ảnh bìa, ảnh đại diện, tệp đính kèm | cloudinary.com | Thư mục: `activities`, `members`, `documents` |
| **Google Gemini** | Trợ lý soạn bài, duyệt bài, ra đề trò chơi, chatbot | aistudio.google.com | Khóa miễn phí: không tạo được ảnh (đã bỏ chức năng tạo ảnh) |
| **GitHub** | Mã nguồn, GitHub Actions (sao lưu) | repo `doan-thanh-nien` | **Phải để chế độ Private** (có quy trình sao lưu dữ liệu học sinh) |
| **Google Search Console** | Đưa trang lên Google | search.google.com/search-console | Xác minh bằng thẻ meta trong `layout.tsx` |
| **IndexNow** | Báo Bing/Yandex… khi có bài mới | tự động | Khóa tự sinh từ `AUTH_SECRET`, công khai ở `/indexnow.txt` |
| **Nhà cung cấp tên miền / DNS** | Tên miền riêng trỏ về Vercel | bảng DNS của nhà cung cấp | Thêm tên miền trong Vercel → Settings → Domains |

## 6. Biến môi trường

Đặt ở: `.env` (máy cá nhân, **không commit**) và **Vercel → Settings → Environment Variables** (bản chạy thật). Sửa biến trên Vercel xong phải **Redeploy** mới có hiệu lực. Mẫu tên biến: `.env.example`.

| Biến | Bắt buộc | Dùng để | Ghi chú |
|---|:-:|---|---|
| `DATABASE_URL` | ✔ | Kết nối cơ sở dữ liệu | Kết nối trực tiếp |
| `DIRECT_URL` | – | Kết nối trực tiếp để tạo bảng (`prisma db push`) | `schema.prisma` khai báo `directUrl = env("DIRECT_URL")`. Lệnh `npm run db:push` / build Vercel (`scripts/db-push.mjs`) **tự lấy `DATABASE_URL` thay** nếu bỏ trống. Chạy thẳng `npx prisma db push` thì phải tự đặt: `export DIRECT_URL="$DATABASE_URL"` |
| `DATABASE_POOLED_URL` | – | Kết nối qua bộ gom kết nối khi chạy trên Vercel | Nếu có, web dùng chuỗi này; tránh lỗi "too many connections" |
| `DB_CONNECTION_LIMIT` | – | Số kết nối tối đa mỗi tiến trình | Mặc định 2 |
| `AUTH_SECRET` | ✔ | Ký phiên đăng nhập, tạo khóa IndexNow | Tối thiểu 32 ký tự. **Đổi giá trị = mọi người bị đăng xuất** |
| `APP_URL` | ✔ | Địa chỉ chính thức của web (QR điểm danh, sitemap, ảnh chia sẻ) | Có `https://`, không có `/` cuối. Chọn **một** địa chỉ chính |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | ✔ | Tải ảnh/tệp | Chỉ dùng phía máy chủ |
| `CRON_SECRET` | ✔ | Bảo vệ 3 đường dẫn cron | Vercel tự gửi kèm khi gọi cron |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | – | Thông báo đẩy | **Phải là cặp tạo cùng lúc** (`npx web-push generate-vapid-keys`). Dán không kèm dấu nháy |
| `VAPID_SUBJECT` | – | Địa chỉ liên hệ gắn với khóa VAPID | Dạng `mailto:email@...` |
| `GEMINI_API_KEY` | – | Bật các chức năng AI và chatbot | Trống thì nút AI và chatbot tự ẩn |
| `GEMINI_MODEL` | – | Ép model Gemini đầu tiên | Mặc định thử lần lượt các bản "lite" mới nhất |
| `ADMIN_USERNAME`, `ADMIN_INITIAL_PASSWORD` | – | Tài khoản Admin đầu tiên khi cơ sở dữ liệu **trống** | Bỏ trống mật khẩu thì sinh ngẫu nhiên và in ra nhật ký build |
| `SEED_DEMO` | – | `true` = nạp dữ liệu demo khi cơ sở dữ liệu trống | Chỉ có tác dụng với cơ sở dữ liệu trống |
| `GEMINI_API_BASE`, `PRISMA_LOG` | – | Dùng khi kiểm thử/gỡ lỗi | Không đặt trên bản chạy thật |
| `VERCEL_PROJECT_PRODUCTION_URL`, `NODE_ENV` | tự động | Vercel tự cung cấp | Dùng làm dự phòng cho `APP_URL` |

**GitHub Secrets** (kho → Settings → Secrets and variables → Actions → Secrets):

| Secret | Dùng để |
|---|---|
| `BACKUP_DATABASE_URL` | Địa chỉ kết nối cơ sở dữ liệu cho sao lưu (giống `DATABASE_URL`/`DIRECT_URL`) |
| `BACKUP_PASSPHRASE` | Mật khẩu mã hóa bản sao lưu (≥ 16 ký tự). **Tự cất giữ, mất là không giải mã được** |

## 7. Triển khai (deploy)

**Quy trình thường ngày:** commit → `git push` lên nhánh `main` → Vercel tự build và triển khai (khoảng 1–2 phút) → kiểm tra trang thật.

Lệnh build trên Vercel (`vercel-build` trong `package.json`), chạy theo thứ tự:
1. `prisma generate`: sinh Prisma Client.
2. `node scripts/db-push.mjs`: **đồng bộ cấu trúc bảng** theo `schema.prisma` (có thử lại khi hết kết nối).
3. `tsx prisma/bootstrap.ts`: khởi tạo nếu cơ sở dữ liệu trống (các loại hoạt động mặc định, tài khoản Admin). Cơ sở dữ liệu đã có người dùng thì **không làm gì, không bao giờ xóa dữ liệu**.
4. `next build`.

**Thay đổi cấu trúc cơ sở dữ liệu (rất quan trọng):**
- Dự án dùng `prisma db push`, **không có tệp migration**. Cấu trúc bảng trên cơ sở dữ liệu thật được cập nhật mỗi lần build.
- **Thêm** bảng/cột (cho phép trống) là an toàn. **Xóa/đổi** cột hoặc bảng làm `db push` dừng và đòi cờ `--accept-data-loss`, và **build thất bại**. Nếu cần xóa, kiểm tra cột trống trước, sao lưu, rồi chạy `npx prisma db push --accept-data-loss` thủ công một lần.
- **Khớp mã và cơ sở dữ liệu:** `schema.prisma` đang commit phải khớp những gì cơ sở dữ liệu thật có (vì máy phát triển dùng chung cơ sở dữ liệu thật). Tránh để schema thiếu bảng mà cơ sở dữ liệu đang có.
- Bảng `Certificate` và giá trị `CERTIFICATE` của `NotificationType` là phần của chức năng giấy khen **làm dở, chưa dùng**. Chúng nằm sẵn trong cơ sở dữ liệu nên giữ trong schema; chỉ gỡ khi chủ động quyết định bỏ.

**Tên miền riêng:** Vercel → dự án → Settings → Domains → thêm tên miền, rồi tạo bản ghi DNS theo hướng dẫn Vercel hiển thị. Sau đó đặt `APP_URL` thành tên miền chính, **Redeploy**. Đổi tên miền ảnh hưởng: mã QR điểm danh (đã in sẽ trỏ tên miền cũ), khóa vân tay đã đăng ký (gắn với tên miền), thông báo đẩy (gắn với tên miền), xác minh Google Search Console (phải xác minh lại).

**Quay lại bản cũ:** Vercel → Deployments → chọn bản ổn định → *Instant Rollback* (chỉ quay lại **mã**, không quay lại **dữ liệu**; dữ liệu khôi phục bằng bản sao lưu).

**Thiết lập máy phát triển:**
```
npm install
cp .env.example .env     # điền DATABASE_URL, AUTH_SECRET, APP_URL, Cloudinary…
npm run db:push          # đồng bộ bảng
npm run dev              # http://localhost:3000
npm run lint             # kiểm tra kiểu (tsc --noEmit)
```
> Máy phát triển trỏ vào **cơ sở dữ liệu thật** nếu `.env` dùng chung. Khi thử chức năng, chỉ dùng dữ liệu có tiền tố "[Test]" và dọn ngay.
> Sau khi `schema.prisma` đổi và chạy `prisma generate`, phải **dừng và chạy lại `npm run dev`** (Prisma Client cũ nằm trong bộ nhớ, nếu không sẽ báo lỗi kiểu "Unknown argument").

## 8. Tác vụ định kỳ (cron)

Khai báo trong `vercel.json`, gọi các đường dẫn có kiểm tra `CRON_SECRET`. Giờ theo **UTC**.

| Đường dẫn | Giờ (UTC → giờ VN) | Việc làm |
|---|---|---|
| `/api/cron/reminders` | 00:00 → 07:00 | Nhắc lịch cho người đã đăng ký hoạt động bắt đầu trong 24 giờ tới (thông báo + đẩy) |
| `/api/cron/rollover` | 00:10 → 07:10 | Chuyển năm học tự động |
| `/api/cron/cleanup` | 18:30 → 01:30 | Xóa thông báo đã đọc quá 90 ngày, thông báo quá 120 ngày, nhật ký quá 120 ngày (`src/lib/services/cleanup.ts`). Điểm danh, điểm, huy hiệu, báo cáo **không bị xóa** |

## 9. Sao lưu và khôi phục

Chi tiết từng bước: `docs/SAO-LUU.md`. Tóm tắt:
- **Tự động:** GitHub Actions (`.github/workflows/db-backup.yml`) chạy **mỗi ngày 04:00 giờ VN** (cron `0 21 * * *` UTC; có thể trễ vài phút), xuất toàn bộ cơ sở dữ liệu bằng `pg_dump`, **mã hóa AES-256**, lưu thành tệp tải về (mục *Artifacts* của lần chạy). Chỉ giữ **7 bản gần nhất** (vừa đặt thời hạn 7 ngày vừa tự xóa bản dư). Cũng chạy tay được (Actions → *Run workflow*).
- **Điều kiện chạy:** kho GitHub phải **Private** (quy trình tự từ chối nếu công khai); cần hai secret `BACKUP_DATABASE_URL`, `BACKUP_PASSPHRASE`.
- **Khôi phục:** tải tệp `.dump.gpg` → `./scripts/restore-backup.sh <tệp> <địa-chỉ-cơ-sở-dữ-liệu-đích>` (nhập mật khẩu giải mã, gõ `CHAC CHAN` để xác nhận). Lệnh **xóa bảng hiện có ở đích** rồi nạp lại. **Luôn thử vào một cơ sở dữ liệu trống trước.**
- **Xem nhanh bản sao lưu:** `pg_restore --list <tệp.dump>` (danh sách bảng); `pg_restore --data-only --table=Member <tệp.dump> | head` (dữ liệu một bảng).
- **Cần làm định kỳ:** mỗi 1–3 tháng thử khôi phục một bản vào cơ sở dữ liệu trống để chắc bản sao lưu còn dùng được. Cất giữ `BACKUP_PASSPHRASE` ở trình quản lý mật khẩu.
- **Trước thao tác rủi ro** (xóa hàng loạt, sửa dữ liệu hàng loạt, đổi cấu trúc bảng): chạy sao lưu tay trước.

## 10. Chức năng AI và chatbot

- Bật khi có `GEMINI_API_KEY`. Gọi từ máy chủ, khóa không xuống trình duyệt. Thử lần lượt chuỗi model dự phòng khi quá tải/hết giờ (`src/lib/ai/gemini.ts`).
- **Trợ lý soạn bài** (viết bản nháp, nhuận sắc, rút gọn, sửa chính tả, gợi ý tiêu đề), **AI soát bài chờ duyệt**, **ra đề trò chơi**: chỉ Admin/Bí thư, hạn mức **40 lượt mỗi người trong 24 giờ** (đếm theo nhật ký, `src/lib/ai/quota.ts`).
- **Chatbot "Trợ lý Đoàn trường AI"** (trang công khai): chỉ trả lời dựa trên nội dung công khai; giới hạn **10 câu mỗi IP mỗi giờ** và **400 câu cả hệ thống mỗi ngày** (`src/actions/chat.ts`). Các lượt hỏi ghi vào nhật ký (làm nhật ký tăng nhanh).
- Nội dung do AI sinh luôn cần người đọc lại. Nội dung nháp có chỗ `[ghi rõ …]` được tô vàng và cảnh báo trước khi đăng.

## 11. Hạn mức và theo dõi

- **Vercel Functions Storage** (gói miễn phí giới hạn 10 GB): mỗi lần triển khai giữ lại một gói chạy. Đã xảy ra gần đầy (8,9 GB) do hơn 100 bản triển khai. Cách xử lý: Settings → *Deployment Retention* (đặt Production ≈ 7 ngày, các mục khác ngắn nhất), xóa bản cũ bằng `vercel remove doan-thanh-nien --safe`, và **gom nhiều thay đổi vào một lần push**. Commit chỉ đổi tài liệu/sao lưu thì thêm `[skip ci]` vào đầu thông điệp để không tạo bản triển khai.
- **Prisma Postgres:** theo dõi *Total operations* và *Egress* trên bảng điều khiển. Nhiều lượt xem công khai làm tăng số thao tác (xem mục 13: cache).
- **Gemini:** có hạn mức theo phút/ngày (xem ai.dev/rate-limit); hết hạn mức thì chatbot báo "đang bận".

## 12. SEO

- `src/app/sitemap.ts` tạo `/sitemap.xml` (trang cố định + bài viết đã đăng + trang giới thiệu); `src/app/robots.ts` chặn khu quản trị.
- Mỗi bài có địa chỉ chuẩn, thẻ chia sẻ và dữ liệu có cấu trúc (Bài viết/Sự kiện).
- Khi đăng/sửa/ẩn/xóa bài, hệ thống tự gửi địa chỉ cho IndexNow (Bing, Yandex…). **Google không nhận cách này**: gửi `sitemap.xml` một lần trong Search Console, Google tự quay lại thu thập.
- Cốc Cốc có bộ thu thập riêng, tự đọc `robots.txt` và sitemap; không có biểu mẫu gửi công khai.

## 13. Việc còn dang dở và ý tưởng tiếp theo

**Cần kiểm tra/cấu hình:**
- [ ] Xác nhận `APP_URL` trên Vercel đúng tên miền chính.
- [ ] Kiểm tra cặp khóa VAPID đúng và dán không dấu nháy; thử lại **Bật thông báo đẩy**.
- [ ] Gửi `sitemap.xml` trong Google Search Console; theo dõi lập chỉ mục.
- [ ] Đặt Deployment Retention trên Vercel và lưu.
- [ ] Thử khôi phục bản sao lưu vào cơ sở dữ liệu trống ít nhất một lần.

**Việc dang dở trong mã:**
- Chức năng **giấy khen điện tử** làm dở: còn `package.json`/`package-lock.json` (thêm `pdf-lib`, `@pdf-lib/fontkit`), thư mục `src/assets` (phông chữ) chưa commit, bảng `Certificate` trong schema chưa dùng. Quyết định: làm tiếp hay gỡ bỏ.
- **Cache trang công khai** (đã đề xuất, chưa làm): lưu sẵn trang tin/sự kiện, tự xóa cache khi dữ liệu đổi (theo thẻ), loại trừ trang theo người xem (danh sách trò chơi) và trang cần đăng nhập. Giảm tải cơ sở dữ liệu và tăng tốc.

**Ý tưởng nâng cấp chức năng sẵn có:** nhập hàng loạt hồ sơ chi tiết bằng Excel; hiển thị mức hoàn thiện hồ sơ; lên lớp cuối năm bằng một nút; nhắc lịch trước 1 giờ; báo cáo PDF/Word theo mẫu; đánh giá sau hoạt động; đăng nhập hai lớp cho Admin.

## 14. Xử lý sự cố thường gặp

| Hiện tượng | Nguyên nhân thường gặp | Cách xử lý |
|---|---|---|
| Trang báo `Unknown argument …` hoặc `db.xxx` undefined (chạy máy cá nhân) | Prisma Client cũ trong bộ nhớ sau khi đổi schema | Dừng `npm run dev` (Ctrl+C) rồi chạy lại |
| Build Vercel lỗi ở bước `db push` và đòi `--accept-data-loss` | Schema đang commit thiếu bảng/cột mà cơ sở dữ liệu thật có | Đưa lại bảng/cột đó vào schema, hoặc xóa chủ động sau khi sao lưu |
| Bật thông báo đẩy báo "String contains an invalid character" | Khóa VAPID dính dấu nháy/khoảng trắng | Dán lại khóa không kèm dấu nháy (mã đã tự làm sạch); Redeploy |
| Bật thông báo đẩy nhưng không nhận được | Khóa công khai và khóa riêng không cùng cặp | Tạo lại cặp khóa mới, đặt cả hai, Redeploy, đăng ký lại thiết bị |
| Nút AI và chatbot không hiện | Thiếu `GEMINI_API_KEY` | Đặt biến rồi Redeploy |
| Chatbot/AI báo "đang bận" | Hết hạn mức của Google | Chờ hoặc bật thanh toán cho khóa |
| QR điểm danh mở nhầm địa chỉ | `APP_URL` sai hoặc thiếu | Đặt đúng `APP_URL`, Redeploy, **in lại QR** |
| Lỗi "too many connections" | Quá nhiều kết nối từ nhiều tiến trình | Đặt `DATABASE_POOLED_URL`, hoặc giảm `DB_CONNECTION_LIMIT` |
| Sao lưu GitHub báo "Thiếu secret" | Secret chưa tạo, sai tên hoặc tạo nhầm tab Variables | Tạo lại đúng tên trong tab **Secrets** |
| Sao lưu GitHub báo kho công khai | Kho ở chế độ Public | Chuyển kho sang Private |
| `robots.txt`/`sitemap.xml` chuyển về trang đăng nhập | Thiếu trong `PUBLIC_PREFIXES` của `proxy.ts` | Thêm đường dẫn vào danh sách |
| Chức năng Vercel "Functions Storage" gần đầy | Quá nhiều bản triển khai cũ | Xem mục 11 |

## 15. Nguyên tắc làm việc đã thống nhất

- Giao diện tiếng Việt, gọn gàng, xanh Đoàn `#0b63b8` và vàng `#ffd400`; nút hành động (Đăng/Lưu/Hủy) ở góc trên bên phải trang; cài đặt gom ở trang **Cài đặt**; hỗ trợ chế độ tối cho khu quản trị.
- Thử chức năng trên máy cá nhân dùng chung cơ sở dữ liệu thật: chỉ dùng dữ liệu có tiền tố "[Test]" và dọn ngay.
- Không dừng tiến trình `next dev` của người khác khi đang chạy; không in hay gửi khóa bí mật vào cuộc trò chuyện hay tệp commit.
- Chỉ `git push` khi chủ dự án yêu cầu; gom thay đổi để hạn chế số bản triển khai.
