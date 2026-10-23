# Mô tả chi tiết hệ thống: Cổng thông tin điện tử và quản lý Đoàn trường THPT Sơn Hà

> **Mục đích tài liệu:** mô tả đầy đủ và chính xác hệ thống (chức năng, quy tắc nghiệp vụ, dữ liệu, phân quyền, luồng xử lý, giới hạn kỹ thuật) để làm nguồn cho công cụ sinh bảng mô tả, sơ đồ chức năng, tài liệu hướng dẫn hoặc báo cáo giới thiệu (ví dụ NotebookLM).
> **Cách đọc:** mục 1–3 là bức tranh chung; mục 4–9 mô tả từng chức năng; mục 10–16 là dữ liệu, nhật ký, tự động hóa, bảo mật; mục 17 là hạn chế; mục 18–19 là thuật ngữ và câu hỏi thường gặp. Mọi con số (giới hạn ký tự, thời gian hết hạn, số lượng...) là giá trị thật đang dùng trong hệ thống.
> **Ngôn ngữ giao diện:** toàn bộ tiếng Việt.

---

## 1. Tổng quan

**Tên:** Đoàn trường THPT Sơn Hà – Cổng thông tin điện tử và hệ thống quản lý Đoàn.
**Đơn vị:** Đoàn TNCS Hồ Chí Minh, Trường THPT Sơn Hà, Xã Sơn Hà, Tỉnh Quảng Ngãi.
**Quy mô thiết kế:** khoảng 1.400 đoàn viên, nhiều Chi đoàn (mỗi Chi đoàn gắn một lớp theo khóa), dùng trên máy tính và điện thoại.

### 1.1 Hai phần của hệ thống

| Phần | Truy cập | Mục đích |
|---|---|---|
| **Website công khai (Cổng thông tin điện tử)** | Ai cũng xem, không cần đăng nhập | Truyền thông chính thức của Đoàn trường: tin tức, kế hoạch, sự kiện, thông báo, lịch hoạt động, lịch công tác tuần, báo cáo Chi đoàn, bảng thi đua, hộp thư góp ý ẩn danh. |
| **Hệ thống quản lý nội bộ** | Cần đăng nhập, phân quyền theo vai trò | Quản lý đoàn viên, Chi đoàn, hoạt động, điểm danh bằng mã QR, điểm rèn luyện, huy hiệu, thi đua, bảng tin, bình chọn, báo cáo, lịch năm học, lịch công tác và quản trị nội dung cổng thông tin. |

Hai phần dùng chung một cơ sở dữ liệu. Người đã đăng nhập thấy nút **"Quản lý"** trên website công khai, và trong hệ thống quản lý có nút **"Trang công khai"** để chuyển qua lại.

### 1.2 Mục tiêu
- Số hóa công tác Đoàn trong trường: giảm việc thủ công (điểm danh, tính điểm, tổng hợp báo cáo, lập lịch).
- Minh bạch và khuyến khích: bảng thi đua, huy hiệu, thành tích hiển thị công khai.
- Truyền thông chính thức: một cổng thông tin do Admin quản trị, bí thư đóng góp nội dung qua quy trình duyệt.
- Thân thiện với điện thoại: dùng như một ứng dụng (PWA), nhận thông báo đẩy.

### 1.3 Phong cách giao diện
Hiện đại, gọn, không nặng thẻ bo tròn. Màu chủ đạo **xanh Đoàn #0b63b8**, nhấn **vàng #ffd400**, nền có huy hiệu Đoàn mờ. Bố cục chiếm toàn chiều ngang. Trên điện thoại ưu tiên danh sách một dòng gọn, thanh điều hướng dưới và khung chờ (skeleton) khi tải.

---

## 2. Công nghệ, kiến trúc và triển khai

| Thành phần | Công nghệ / cách làm |
|---|---|
| Khung ứng dụng | Next.js 16 (App Router, Server Components, Server Actions), React 19, TypeScript |
| Giao diện | Tailwind CSS 4; biểu tượng lucide-react; biểu đồ recharts; thông báo nhỏ sonner |
| Cơ sở dữ liệu | PostgreSQL (dịch vụ Prisma Postgres), truy cập qua Prisma 6; cập nhật cấu trúc bằng `prisma db push` |
| Xác thực | Mật khẩu băm bcrypt (cost 10); phiên đăng nhập là cookie JWT (thư viện jose) hạn **7 ngày** |
| Kiểm tra dữ liệu | Thư viện zod ở máy chủ cho mọi biểu mẫu |
| Lưu ảnh và tệp | Cloudinary (ảnh bìa, ảnh hoạt động, ảnh đại diện; tệp PDF/Word/Excel/PowerPoint đính kèm) |
| Thông báo đẩy | Web Push chuẩn VAPID; Service Worker `sw.js`; có tệp âm thanh `notify.wav` |
| Ứng dụng di động | PWA: tệp manifest, biểu tượng nền xanh Đoàn (192, 512, maskable, iOS) |
| Triển khai | Vercel, vùng Singapore (`sin1`); lệnh build tự chạy cập nhật cấu trúc DB |
| Tác vụ định kỳ | Vercel Cron (3 tác vụ hằng ngày, xem mục 15) |
| Xuất Excel | Thư viện exceljs (báo cáo, file mẫu nhập đoàn viên) |

### 2.1 Kiến trúc xử lý
- **Trang chủ và các trang công khai** được lưu đệm 60 giây (bảng thi đua công khai lưu đệm 5 phút) nên ít đụng database.
- Thao tác ghi dữ liệu đi qua **Server Actions**, mỗi action được bọc bởi một hàm chuẩn hóa lỗi: lỗi nghiệp vụ trả thông báo tiếng Việt cho người dùng, lỗi hệ thống chỉ báo "Đã có lỗi xảy ra" và ghi log nội bộ.
- Lớp chặn nhanh `proxy.ts`: chưa có cookie phiên thì chuyển về trang đăng nhập; danh sách đường dẫn công khai không bị chặn. Việc phân quyền thật được kiểm tra lại ở từng trang và từng action.
- Kết nối database: ưu tiên chuỗi `DATABASE_POOLED_URL`, nếu không có thì dùng `DATABASE_URL`; mỗi bản sao máy chủ dùng tối đa 2 kết nối.

### 2.2 Biến môi trường
| Biến | Ý nghĩa |
|---|---|
| `DATABASE_URL`, `DATABASE_POOLED_URL`, `DIRECT_URL` | Kết nối database (thường, qua pooler, trực tiếp để cập nhật cấu trúc) |
| `AUTH_SECRET` | Khóa ký phiên đăng nhập và mã QR (tối thiểu 32 ký tự) |
| `APP_URL` | Địa chỉ gốc của website (dùng tạo liên kết QR) |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Lưu ảnh và tệp |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Thông báo đẩy |
| `CRON_SECRET` | Khóa bảo vệ các tác vụ định kỳ |
| `ADMIN_USERNAME`, `ADMIN_INITIAL_PASSWORD`, `SEED_DEMO` | Khởi tạo lần đầu (xem mục 16) |

### 2.3 Điểm cuối (API) chính
| Đường dẫn | Dùng để |
|---|---|
| `/api/upload` | Tải ảnh (JPG/PNG/WebP, tối đa 5MB) và tệp tài liệu (PDF/DOC/DOCX/XLS/XLSX/PPT/PPTX, tối đa 10MB, chỉ Admin) lên Cloudinary |
| `/api/me` | Cho trang công khai biết người xem đã đăng nhập chưa (không trả thông tin cá nhân) |
| `/api/members/template` | Tải file Excel mẫu nhập đoàn viên |
| `/api/reports/export` | Xuất báo cáo Excel (chỉ Admin) |
| `/api/notifications/poll` | Kiểm tra thông báo mới để phát âm thanh |
| `/api/push/subscribe`, `/api/push/unsubscribe` | Đăng ký/hủy nhận thông báo đẩy trên thiết bị |
| `/api/cron/reminders`, `/api/cron/rollover`, `/api/cron/cleanup` | Ba tác vụ định kỳ |

---

## 3. Vai trò và phân quyền

### 3.1 Ba vai trò
| Vai trò | Bản chất |
|---|---|
| **Quản trị hệ thống** | Quản trị tối cao. Tài khoản riêng, không có hồ sơ đoàn viên. Toàn quyền, và là người **duy nhất cấp, sửa, thu hồi, cấp lại quyền tài khoản Ban chấp hành**. |
| **Ban chấp hành Đoàn trường** (Bí thư, Phó Bí thư, Ủy viên...) | Tài khoản riêng do Quản trị hệ thống cấp, có chức danh hiển thị. **Có đủ mọi quyền quản lý như Admin** (đoàn viên, Chi đoàn, hoạt động, thi đua, cổng thông tin, duyệt bài, lịch...), **trừ** cấp/thu hồi tài khoản Ban chấp hành. Trong ma trận bên dưới, cột "Admin" áp dụng cho cả hai. |
| **Bí thư Chi đoàn** | **Không phải tài khoản riêng.** Là tài khoản của một đoàn viên được Admin gán thêm vai trò bí thư. Giữ nguyên quyền đoàn viên, cộng thêm quyền quản lý trong phạm vi Chi đoàn mình. |
| **Đoàn viên** | Học sinh là đoàn viên. Có hồ sơ, thẻ số, tham gia và điểm danh hoạt động. |

### 3.2 Ma trận quyền theo chức năng

> **Cột "Admin" áp dụng cho cả Quản trị hệ thống và Ban chấp hành Đoàn trường**, trừ dòng "Cấp, sửa, thu hồi tài khoản Ban chấp hành" chỉ Quản trị hệ thống làm được.
Ký hiệu: ✔ có, ✖ không, ◐ có điều kiện (ghi chú).

| Chức năng | Admin | Bí thư | Đoàn viên | Khách |
|---|---|---|---|---|
| Xem website công khai, góp ý ẩn danh | ✔ | ✔ | ✔ | ✔ |
| Xem hồ sơ, thẻ số, lịch sử của mình | ✖ (không có hồ sơ) | ✔ | ✔ | ✖ |
| Xem danh sách đoàn viên | ✔ tất cả | ◐ chỉ Chi đoàn mình | ✖ | ✖ |
| Thêm/sửa/xóa đoàn viên, nhập Excel | ✔ | ✖ | ✖ | ✖ |
| Khóa/mở khóa tài khoản, cấp lại mật khẩu tạm | ✔ | ✖ | ✖ | ✖ |
| Điều chỉnh điểm cho đoàn viên | ✔ | ✖ | ✖ | ✖ |
| Tạo/sửa/xóa Chi đoàn, bầu bí thư, chuyển năm học | ✔ | ✖ | ✖ | ✖ |
| Tạo/sửa hoạt động | ✔ mọi hoạt động (kể cả toàn trường) | ◐ chỉ hoạt động của Chi đoàn mình | ✖ | ✖ |
| Hủy/xóa hoạt động | ✔ | ◐ Chi đoàn mình | ✖ | ✖ |
| Đăng ký/hủy đăng ký hoạt động | ✖ | ✔ | ✔ | ✖ |
| Mở/đóng điểm danh, hiển thị QR, điểm danh hộ, hủy điểm danh | ✔ | ◐ hoạt động của Chi đoàn mình | ✖ | ✖ |
| Quét QR điểm danh | ✖ | ✔ | ✔ | ✖ |
| Ghi điểm thi đua trường cho Chi đoàn | ✔ | ✖ | ✖ | ✖ |
| Xem thi đua | ✔ | ✔ | ✔ | ✔ (công khai) |
| Cấu hình loại hoạt động, huy hiệu | ✔ | ✖ | ✖ | ✖ |
| Đăng bài bảng tin | ✔ (toàn trường hoặc một Chi đoàn) | ◐ trong Chi đoàn mình | ✖ | ✖ |
| Thích, bình luận bảng tin | ✔ | ✔ | ✔ | ✖ |
| Tạo bình chọn | ✔ | ✖ | ✖ | ✖ |
| Bỏ phiếu bình chọn | ✔ | ✔ | ✔ | ✖ |
| Soạn bài Tin tức/Kế hoạch/Sự kiện/Thông báo | ✔ đăng trực tiếp | ◐ chỉ lưu nháp, chờ duyệt | ✖ | ✖ |
| Duyệt và đăng bài, ẩn/hiện bài | ✔ | ✖ | ✖ | ✖ |
| Đăng báo cáo Chi đoàn | ✔ mọi Chi đoàn | ◐ Chi đoàn mình | ✖ | ✖ |
| Soạn trang giới thiệu, chữ chạy, thông tin website, banner, đếm ngược | ✔ | ✖ | ✖ | ✖ |
| Xem và xử lý góp ý | ✔ | ✖ | ✖ | ✖ |
| Soạn lịch công tác tuần, công bố | ✔ | ✖ | ✖ | ✖ |
| Cấu hình lịch năm học | ✔ | ✖ | ✖ | ✖ |
| Xem báo cáo hoạt động, xuất Excel | ✔ | ✖ | ✖ | ✖ |
| Xem nhật ký hệ thống, dung lượng, dọn dữ liệu | ✔ | ✖ | ✖ | ✖ |
| Cấp, sửa, cấp lại mật khẩu, thu hồi tài khoản Ban chấp hành | ✔ chỉ Quản trị hệ thống | ✖ | ✖ | ✖ |

### 3.3 Nguyên tắc phạm vi dữ liệu
- Bí thư chỉ thấy đoàn viên và hoạt động của **Chi đoàn mình** và các hoạt động **toàn trường** (xem được, không sửa được). Mở đường dẫn của Chi đoàn khác sẽ nhận trang 404, không lộ sự tồn tại.
- Hoạt động **toàn trường** (không gắn Chi đoàn) chỉ Admin quản lý.
- Đoàn viên chỉ truy cập hồ sơ của chính mình.
- Phân quyền được kiểm tra **ở máy chủ** cho mọi truy vấn và thao tác, không chỉ ẩn nút trên giao diện.

---

## 4. Tài khoản và xác thực

### 4.1 Đăng nhập
- Nhập **tên đăng nhập** hoặc **mã đoàn viên** (không phân biệt hoa thường với mã) và mật khẩu.
- Đoàn viên: tên đăng nhập chính là **mã đoàn viên**, dạng `SH` + năm + số thứ tự 4 chữ số, ví dụ `SH20260001`.
- Giới hạn đăng nhập sai: tối đa **8 lần trong 15 phút** cho mỗi cặp tên đăng nhập + địa chỉ IP, quá thì tạm chặn.
- Thông báo lỗi chung "Tên đăng nhập hoặc mật khẩu không đúng" (không tiết lộ tài khoản có tồn tại hay không). Tài khoản bị khóa báo riêng.
- Phiên đăng nhập kéo dài **7 ngày** kể từ lúc đăng nhập, không tự gia hạn. Đăng xuất xóa cookie ngay.
- Khóa tài khoản có hiệu lực **ngay**, vì mỗi lần mở trang hệ thống nạp lại người dùng từ database.

### 4.1b Đăng nhập nhanh bằng vân tay / khuôn mặt (Passkey)
- Sau khi đăng nhập bằng mật khẩu, người dùng vào **Cài đặt → Đăng nhập nhanh → "Bật trên thiết bị này"** để lưu một khóa đăng nhập vào điện thoại/máy tính. Mỗi tài khoản tối đa **5 thiết bị**; xem danh sách (tên thiết bị, ngày thêm, lần dùng gần nhất) và xóa từng thiết bị ở cùng tab.
- Ở trang đăng nhập có nút **"Đăng nhập bằng vân tay / khuôn mặt"** (chỉ hiện khi trình duyệt hỗ trợ): thiết bị tự đề xuất khóa đã lưu, người dùng xác nhận bằng vân tay, khuôn mặt hoặc mã khóa màn hình, không cần nhớ mật khẩu hay gõ tên đăng nhập.
- Chuẩn WebAuthn: dữ liệu sinh trắc học không rời khỏi thiết bị; máy chủ chỉ lưu khóa công khai. Cần HTTPS; khóa gắn với tên miền. Tài khoản bị khóa thì không đăng nhập nhanh được; khi Admin cấp lại mật khẩu tạm cho một đoàn viên, mọi thiết bị đăng nhập nhanh của tài khoản đó bị thu hồi.
- Ô nhập mật khẩu ở trang đăng nhập và đổi mật khẩu có **nút con mắt** để xem hoặc ẩn mật khẩu.

### 4.2 Mật khẩu
- Mật khẩu tạm thời do hệ thống sinh (10 ký tự ngẫu nhiên), hiển thị **một lần** khi tạo tài khoản hoặc cấp lại. Đoàn viên **bắt buộc đổi mật khẩu** ở lần đăng nhập đầu.
- Mật khẩu mới: tối thiểu **8 ký tự**, tối đa 72, có ít nhất một chữ cái và một chữ số, khác mật khẩu hiện tại, phải nhập lại khớp.
- Hệ thống **không gửi email**, nên "Quên mật khẩu" hướng dẫn liên hệ Admin để được cấp lại mật khẩu tạm.

### 4.3 Hồ sơ tài khoản (Cài đặt → Tài khoản)
- Mọi người dùng tự **đổi ảnh đại diện**. Đoàn viên/bí thư: ảnh lưu vào hồ sơ đoàn viên (hiện cả trên thẻ số). Admin: ảnh lưu ở tài khoản.
- **Admin tự đổi họ tên** hiển thị. Họ tên đoàn viên/bí thư do Admin quản lý trong hồ sơ.
- Mọi người dùng bật thông báo đẩy, bật/tắt âm thanh, đổi mật khẩu ở các tab tương ứng.

---

## 5. Website công khai

### 5.1 Khung chung của mọi trang công khai
1. **Thanh liên hệ** (xanh): Hotline và Email bên trái; Facebook và YouTube bên phải. Lấy từ cài đặt, ô nào trống thì ẩn.
2. **Hàng thương hiệu** (nền trắng): huy hiệu, "Đoàn TNCS Hồ Chí Minh", tên trường, địa chỉ (lấy từ cài đặt) và ô tìm kiếm.
3. **Thanh menu** (xanh đậm, dính khi cuộn): nút nhà, Giới thiệu, Kế hoạch, Tin tức, Thi đua, Định hướng, Sinh hoạt Chi đoàn, Thông báo, Trò chơi, Góp ý, Báo cáo Chi đoàn, **Liên kết** (menu thả xuống). Chữ và khoảng đệm **co giãn theo bề rộng màn hình**; màn hình hẹp (dưới khoảng 1360px) dùng nhãn ngắn (Sinh hoạt, Báo cáo), và bên phải chữ **"Đăng nhập"** (đổi thành **"Trang quản lý"** khi đã đăng nhập). Trên điện thoại là nút ☰ Menu mở danh sách.
4. **Banner** (chỉ trang chủ): ảnh Admin tải lên, full chiều ngang; chưa có ảnh thì hiện banner mặc định "CỔNG THÔNG TIN ĐIỆN TỬ / ĐOÀN TRƯỜNG THPT SƠN HÀ / ĐOÀN TNCS HỒ CHÍ MINH" với huy hiệu và hoa văn sóng (ẩn trên điện thoại để gọn).
5. **Dòng ngày và chữ chạy:** ngày hôm nay (giờ Việt Nam) và dòng thông điệp chạy ngang nối đuôi liên tục, rê chuột để dừng, tôn trọng thiết lập "giảm chuyển động". Trên điện thoại ô tìm kiếm nằm cạnh ngày.
6. **Thanh bên trái** (máy tính): ba nhóm luôn mở sẵn: **Giới thiệu** (Đoàn trường, BCH Đoàn trường, Cơ cấu tổ chức, Nội quy), **Báo cáo Chi đoàn** (Khối 10/11/12, mở ra danh sách lớp), **Thi đua** (Bảng thi đua tháng, Thành tích, Chi đoàn tiêu biểu).
7. **Chân trang:** logo, tên, địa chỉ, điện thoại, email, các liên kết nhanh và nút "Đăng nhập hệ thống quản lý".
- **Menu Liên kết** gồm 5 trang ngoài, mở tab mới: Trường THPT Sơn Hà, Sở GD&ĐT Quảng Ngãi, Bộ GD&ĐT, Trung ương Đoàn TNCS Hồ Chí Minh, Tỉnh Đoàn Quảng Ngãi.
- Khi **in** một trang, các phần header, menu, thanh bên, chân trang bị ẩn (xem Lịch công tác).

### 5.2 Trang chủ (`/`)
- **Đếm ngược** (nếu Admin đặt tên sự kiện và thời điểm còn ở tương lai): khung xanh hiện số Ngày, Giờ, Phút, Giây chạy từng giây; bấm vào mở liên kết (nếu có); hết giờ tự ẩn.
- **Các khối** (mỗi khối có tiêu đề xanh, nút "Xem tất cả" ở góc phải), lấy bản ghi mới nhất theo ngày đăng:

| Khối | Số bản ghi | Cách hiển thị |
|---|---|---|
| Tin tức | 6 | 1 tin nổi bật (ảnh lớn, tóm tắt) bên trái + 5 tin bên phải |
| Thông báo | 6 | Danh sách, mỗi mục có hình thu nhỏ nếu có ảnh/tệp |
| Sự kiện | 4 | Dòng gọn: ảnh nhỏ, tiêu đề, một dòng "thời gian · địa điểm" |
| Kế hoạch | 4 | Dòng gọn: ảnh nhỏ, tiêu đề, ngày đăng |
| Hoạt động sắp tới | 5 | Ngày/tháng, tên, giờ, Chi đoàn hoặc toàn trường, địa điểm |
| Thi đua tháng | 3 | Top 3 Chi đoàn của tháng hiện tại |

- Dữ liệu trang chủ làm mới mỗi 60 giây.

### 5.3 Hình thu nhỏ của bài viết
Mỗi bài trong danh sách có hình đứng đầu, chọn theo thứ tự ưu tiên:
1. Ảnh bìa của bài.
2. Nếu không có ảnh bìa mà có **tệp PDF** đính kèm: phần trên của **trang đầu tiên của PDF** (cắt khung ngang, do Cloudinary dựng).
3. Có tệp Word/Excel/PowerPoint: ô biểu tượng theo loại tệp (PDF đỏ, Excel xanh lá, PowerPoint cam, Word xanh dương).
4. Không có gì: không hiện hình, bài chiếm hết chiều ngang.

### 5.4 Tin tức, Kế hoạch, Sự kiện, Thông báo
- **Trang danh sách:** `/tin-tuc`, `/ke-hoach`, `/su-kien`, `/thong-bao`; phân trang; mỗi bài có hình thu nhỏ, tiêu đề, ngày đăng, tóm tắt (Sự kiện có thêm thời gian diễn ra và địa điểm).
- **Trang chi tiết:** `/bai-viet/<slug>`, chia **2/3 nội dung và 1/3 cột phải**:
  - Vùng chính: đường dẫn (Trang chủ › loại bài), tiêu đề, ngày đăng, người đăng, thời gian/địa điểm (sự kiện), ảnh bìa (cao tối đa 320px), tóm tắt, nội dung định dạng, **tệp đính kèm** (xem trực tiếp trong trang hoặc tải về với đúng tên tệp; PDF xem bằng bộ xem của Google, Office xem bằng Office Online).
  - Cột phải: các khối bài khác. Khối đầu là cùng loại với bài đang xem (4 bài, không tính bài hiện tại), tiếp theo là 3 loại còn lại (3 bài mỗi loại), mỗi bài có hình thu nhỏ.
- Chỉ bài đã **hiển thị** và đã đến thời điểm đăng mới xuất hiện công khai.
- **Định dạng nội dung đơn giản:** `## Tiêu đề`, `### Tiêu đề nhỏ`, `- gạch đầu dòng`, `1. đánh số`, `**chữ đậm**`, cách một dòng trống để tách đoạn.

### 5.5 Lịch hoạt động (`/lich-hoat-dong`)
- Liệt kê các hoạt động (không bị hủy) trong khoảng thời gian chọn, của toàn trường và mọi Chi đoàn.
- **Bộ chọn Năm học → Tuần** đặt cùng hàng với tiêu đề trên màn hình lớn: ô Năm học, rồi `‹ [Tuần …] ›` với hai nút chuyển tuần hai bên. Tùy chọn trong ô Tuần: Cả năm học, Học kỳ 1, Học kỳ 2, và từng tuần chia theo hai học kỳ, mỗi tuần kèm ngày tháng (ví dụ "Tuần 6 (05/10 – 11/10) · hiện tại").
- Mặc định mở **năm học hiện tại, tuần hiện tại**. Khi xem một tuần: 7 ngày trong tuần, mỗi ngày một dòng, ngày không có hoạt động vẫn hiện dấu "—"; ngày hôm nay được tô nền xanh nhạt kèm chữ "(hôm nay)" xuống dòng riêng. Xem học kỳ hoặc cả năm: danh sách theo thời gian.
- Đường dẫn: `?nh=2026&tuan=6` (hoặc `tuan=hk1`, `hk2`).

### 5.6 Lịch công tác tuần (`/lich-cong-tac`)
- Lịch công tác chính thức do Admin soạn và **công bố** (xem mục 9).
- Cùng bộ chọn Năm học và `‹ Tuần ›`. Bảng 5 cột trên máy tính: **Ngày, Thời gian, Nội dung, Phụ trách, Địa điểm**; trên điện thoại mỗi công việc xếp dọc, nhãn "Phụ trách:", "Địa điểm:" hiện kèm.
- Luôn hiện đủ 7 ngày. Tuần chưa có lịch hoặc chưa công bố: vẫn hiện bảng với ô trống và dòng ghi chú "Chưa có lịch công tác cho tuần này."
- Nút **In lịch** (chỉ hiện khi tuần đã có lịch): khi in, ẩn mọi phần giao diện, chỉ in dòng "Đoàn trường THPT Sơn Hà", tiêu đề "Lịch công tác Tuần n (ngày – ngày)" và bảng.
- Admin xem được **bản nháp** để xem trước, kèm dòng cảnh báo "Bản nháp — chỉ quản trị viên xem được".

### 5.7 Trang giới thiệu (`/gioi-thieu/<slug>`)
Bốn trang nội dung: `doan-truong` (Đoàn trường), `bch-doan-truong` (Ban chấp hành Đoàn trường), `co-cau-to-chuc` (Cơ cấu tổ chức), `noi-quy` (Nội quy). Admin soạn nội dung (định dạng đơn giản, tối đa 50.000 ký tự).

### 5.8 Báo cáo Chi đoàn (`/bao-cao-chi-doan`)
- Danh sách báo cáo công khai do bí thư hoặc Admin đăng, nhóm theo **Khối (10/11/12)** và **Chi đoàn**; lọc theo khối bằng `?khoi=10`.
- Mỗi Chi đoàn có trang riêng liệt kê báo cáo; trang chi tiết báo cáo hiển thị ảnh (cao tối đa 384px), tiêu đề, ngày đăng, nội dung.
- Chỉ hiện Chi đoàn đang học (Chi đoàn đã ra trường không còn trong thanh bên).

### 5.9 Thi đua công khai (`/thi-dua`)
- **Bảng thi đua** (`/thi-dua`): chọn kỳ Tuần / Tháng / Học kỳ / Năm học (xem cách chọn ở mục 8.4); bảng xếp hạng gồm Hạng, Chi đoàn, Đoàn viên, Lượt tham gia, Điểm hoạt động (trung bình), Điểm thi đua trường, Tổng điểm kèm thanh so sánh. Trên điện thoại là danh sách gọn.
- **Thành tích** (`/thi-dua/thanh-tich`): bảng xếp hạng của vài tháng gần đây.
- **Chi đoàn tiêu biểu** (`/thi-dua/chi-doan-tieu-bieu`): top 3 Chi đoàn có tổng điểm dương của học kỳ hiện tại và năm học hiện tại.
- Dữ liệu công khai lưu đệm 5 phút.

### 5.10 Hộp thư góp ý ẩn danh (`/gop-y`)
Xem mục 10.5.

### 5.11 Tìm kiếm (`/tim-kiem?q=`)
Tìm trong tiêu đề/tóm tắt các bài viết đã đăng; cần ít nhất 2 ký tự; hiển thị tối đa 30 kết quả kèm nhãn loại bài.

---

## 6. Hệ thống quản lý nội bộ: tổng quan giao diện

### 6.1 Khung giao diện
- **Thanh trên cùng:** đường dẫn (breadcrumb) có mũi tên quay lại ở đầu (trên điện thoại chỉ hiện tên trang hiện tại), nút **"Cổng thông tin"**, chuông **thông báo**, hộp người dùng (ảnh, họ tên, vai trò; menu: Tài khoản và mật khẩu, Đăng xuất).
- **Thanh bên trái (máy tính)** màu xanh đậm; máy tính bảng thu gọn còn biểu tượng.
- **Điện thoại:** thanh điều hướng dưới với 4 mục chính, nút tròn giữa **"Thêm"** mở bảng danh sách các mục còn lại (dạng danh sách hai cột có tiêu đề nhóm, cuộn được), kèm Đăng xuất.
- **Tiêu đề trang:** tiêu đề bên trái, nút thao tác bên phải cùng hàng nếu đủ chỗ, không thì xuống hàng riêng. Trang chi tiết có tiêu đề dài luôn để nút thao tác ở hàng riêng.
- **Bảng trên máy tính, danh sách gọn trên điện thoại:** mỗi dòng danh sách một dòng, bấm vào mở thẳng trang chi tiết. **Hàng bảng bấm vào đâu cũng mở chi tiết** (trừ liên kết/nút/hộp thoại bên trong; Ctrl hoặc ⌘ + bấm mở tab mới).
- **Khung chờ (skeleton)** khi tải; có khung riêng cho trang biểu mẫu, trang chi tiết và trang theo tuần.
- **Ô nhập tiêu đề dài** tự xuống dòng và cao dần (Enter không tạo dòng mới).

### 6.2 Menu theo vai trò

**Admin (8 mục, nhóm tự mở khi đang ở một mục bên trong):**
1. Tổng quan
2. **Hàng chờ duyệt** (có huy hiệu số việc đang chờ)
3. **Tổ chức:** Đoàn viên, Chi đoàn
4. **Hoạt động:** Hoạt động, Điểm danh, Lịch công tác
5. **Phong trào:** Thi đua, Thành tích
6. **Cộng đồng:** Bảng tin, Bình chọn, Góp ý
7. Báo cáo
8. **Cổng thông tin** (luôn mở sẵn): Tin tức, Kế hoạch, Sự kiện, Thông báo, Trang giới thiệu, Báo cáo Chi đoàn, Dòng chữ chạy, Thông tin website
9. (Dưới cùng) Cài đặt, Đăng xuất

**Bí thư:** Tổng quan, Bảng tin, Đoàn viên (Chi đoàn mình), Hoạt động, Điểm danh, Thi đua, Thành tích, Bình chọn, Báo cáo Chi đoàn (đăng báo cáo của Chi đoàn mình), Hồ sơ & thẻ số, Quét QR, Lịch sử, nhóm **Cổng thông tin** (Tin tức, Kế hoạch, Sự kiện, Thông báo: chỉ soạn nháp của mình), Cài đặt.

**Đoàn viên:** Tổng quan, Bảng tin, Hồ sơ & thẻ số, Hoạt động, Thi đua, Quét QR, Lịch sử, Thành tích, Bình chọn, Cài đặt.

### 6.3 Trang Tổng quan (`/dashboard`)
- **Admin:** số Đoàn viên đang sinh hoạt, số Chi đoàn đang học, số Hoạt động; biểu đồ **tỷ lệ tham gia 6 tháng gần nhất**; bảng **hoạt động gần đây**; bảng **Chi đoàn có tỷ lệ tham gia cao** (top 5).
- **Bí thư:** tiêu đề "Chi đoàn <tên>", số đoàn viên, số hoạt động, tỷ lệ tham gia, tổng điểm; hoạt động sắp tới và đã qua; **danh sách đoàn viên chưa tham gia hoạt động nào** để nhắc; biểu đồ tham gia theo tháng của Chi đoàn.
- **Đoàn viên:** lời chào, nút Quét QR, **Điểm của tôi, Hoạt động đã tham gia, Giờ tình nguyện**; hoạt động sắp tới và nút đăng ký.

---

## 7. Quản lý đoàn viên và Chi đoàn

### 7.1 Đoàn viên (`/members`)
- **Danh sách** có tìm kiếm (tên, mã), lọc theo Chi đoàn, trạng thái; phân trang; trạng thái hiển thị: Đang sinh hoạt, Đã chuyển sinh hoạt, Đã ra trường; biểu thị tài khoản bị khóa.
- **Hồ sơ đoàn viên:** họ tên, giới tính (Nam/Nữ/Khác), ngày sinh, ngày vào Đoàn, khóa (năm nhập học 2000–2100), lớp (tối đa 20 ký tự), Chi đoàn, ảnh đại diện, trạng thái, mã đoàn viên, **tổng điểm**, **giờ tình nguyện**, huy hiệu đã đạt, lịch sử điểm.
- **Thêm đoàn viên (Admin):** nhập hồ sơ; hệ thống tự sinh **mã đoàn viên** (SH + năm + số thứ tự), tạo tài khoản với mật khẩu tạm; lớp mới tự được tạo nếu chưa có trong Chi đoàn.
- **Nhập hàng loạt từ Excel (Admin):**
  - Tải file mẫu `.xlsx`; các cột: **Họ tên** (bắt buộc), **Lớp** (bắt buộc), Ngày sinh, Giới tính, Chi đoàn, Khóa, Ngày vào Đoàn (định dạng dd/mm/yyyy).
  - Tối đa **500 đoàn viên mỗi lần**, tệp tối đa **4MB**. Cột Chi đoàn bỏ trống thì lấy theo lớp; Chi đoàn phải đã tồn tại.
  - Hệ thống báo từng dòng lỗi (thiếu họ tên, thiếu lớp, ngày không hợp lệ, Chi đoàn chưa tồn tại); các dòng hợp lệ vẫn được tạo.
  - Kết quả hiện bảng **tên đăng nhập + mật khẩu tạm** (chỉ hiện một lần) và nút tải CSV để bàn giao.
- **Khóa/mở khóa tài khoản, cấp lại mật khẩu tạm, xóa đoàn viên:** chỉ Admin. Mỗi thao tác ghi nhật ký.
- **Điều chỉnh điểm (Admin):** cộng hoặc trừ từ **-100 đến +100** mỗi lần (khác 0), bắt buộc ghi lý do 3–200 ký tự; **tổng điểm không được xuống dưới 0**; sau điều chỉnh hệ thống xét lại huy hiệu.

**Lớp chính là Chi đoàn:** hệ thống không còn hỏi hay hiển thị "lớp" riêng; chỉ lưu và hiển thị **Chi đoàn** (ví dụ 10A1). Bên trong, mỗi thành viên vẫn gắn với một "lớp" tự tạo trùng tên Chi đoàn để tương thích dữ liệu cũ; khi chuyển năm học, tên đó tự đổi theo Chi đoàn.

### 7.1b Đoàn viên và thanh niên
Mỗi thành viên của Chi đoàn thuộc một trong hai loại: **đoàn viên** (đã vào Đoàn, có ngày vào Đoàn) hoặc **thanh niên** (học sinh chưa vào Đoàn). **Cả hai đều có tài khoản và dùng đầy đủ hệ thống**: xem và đăng ký hoạt động, quét QR điểm danh, tích điểm, chơi trò chơi, xem bảng tin, bình chọn, nhận thông báo.
- **Khác nhau:** thanh niên được ghi "Thanh niên" (thanh trên cùng, hồ sơ, danh sách, thẻ "Thẻ thanh niên số"), không có ngày vào Đoàn, và **không được bầu làm bí thư** Chi đoàn.
- **Tạo:** khi tạo Chi đoàn hoặc "Thêm thành viên" vào Chi đoàn có hai ô danh sách riêng (đoàn viên, thanh niên); thêm từng người có nút chọn Loại; Excel có cột **Loại** ("Đoàn viên" hoặc "Thanh niên", để trống là đoàn viên).
- **Kết nạp:** Admin bấm **"Kết nạp vào Đoàn"** ở hồ sơ thanh niên, chọn ngày vào Đoàn; người đó thành đoàn viên và nhận thông báo chúc mừng.
- **Thống kê:** Tổng quan hiển thị số đoàn viên kèm số thanh niên; danh sách có bộ lọc Loại. Thi đua Chi đoàn vẫn tính điểm bình quân trên **toàn bộ thành viên đang sinh hoạt** (cả hai loại).

### 7.2 Hồ sơ và thẻ đoàn viên số (`/profile`)
- Hồ sơ cá nhân: thông tin, điểm, giờ tình nguyện, huy hiệu, lịch sử cộng/trừ điểm.
- **Đoàn viên tự sửa thông tin cá nhân** (nút "Sửa thông tin" ở hồ sơ): họ tên, ngày sinh, giới tính, ngày vào Đoàn và ảnh. **Không tự đổi được lớp, Chi đoàn, khóa, trạng thái và điểm** (Ban chấp hành quản lý); ngày sinh và ngày vào Đoàn không được ở tương lai; mọi lần tự sửa được ghi nhật ký.
- **Thẻ đoàn viên số:** ảnh, họ tên, mã đoàn viên, Chi đoàn, lớp và **mã QR định danh**; đoàn viên tự đổi ảnh. Mã QR trên thẻ chỉ chứa một mã ngẫu nhiên, không chứa thông tin cá nhân.

### 7.3 Chi đoàn (`/departments`, Admin)
- **Danh sách** hai tab: **Đang học** và **Đã ra trường**. Cột: Chi đoàn, **Niên khóa** (ví dụ 2026–2029), Bí thư, số Đoàn viên, số Hoạt động, Tỷ lệ tham gia.
- **Tạo Chi đoàn:** tên (bắt đầu bằng khối 10/11/12, dạng `12A1` hoặc `12/1`), mô tả, **năm vào lớp 10** (để trống thì tự tính theo khối trong tên và năm học hiện tại) và tùy chọn **danh sách họ tên đoàn viên** (mỗi dòng một người, tối đa 100): hệ thống tự tạo lớp, hồ sơ và tài khoản, hiện bảng mật khẩu tạm một lần.
- **Không cho trùng** cùng tên và cùng khóa; cho phép cùng tên khác khóa (ví dụ 10A1 khóa 2026 và 10A1 khóa 2027).
- **Chi tiết Chi đoàn** (`/departments/<id>`): các nút **Thêm đoàn viên** (dán danh sách họ tên, hệ thống tự tạo hồ sơ + tài khoản và tự tải tệp CSV mật khẩu tạm; hoặc thêm từng người đủ thông tin, hoặc nhập Excel), Đổi bí thư, Sửa, Xóa; chỉ số (đoàn viên, hoạt động, tỷ lệ tham gia, tổng điểm); hoạt động gần đây; danh sách đoàn viên của Chi đoàn có phân trang.
- **Xóa Chi đoàn:** chỉ khi không còn đoàn viên; các hoạt động của Chi đoàn bị xóa theo.

### 7.4 Bầu bí thư
- Nút **"Chọn bí thư"/"Đổi bí thư"** ở trang Chi đoàn: chọn **một đoàn viên đang sinh hoạt** của chính Chi đoàn đó (tài khoản không bị khóa, không phải Admin).
- Tài khoản đó được gán vai trò Bí thư và trở thành bí thư của Chi đoàn; **bí thư cũ tự trở lại là đoàn viên thường** (vẫn giữ tài khoản và dữ liệu).
- **Gỡ chức bí thư** chỉ bỏ vai trò, tài khoản vẫn là đoàn viên.
- Mỗi Chi đoàn có tối đa một bí thư tại một thời điểm.

### 7.5 Niên khóa và chuyển năm học
- Mỗi Chi đoàn gắn một **niên khóa** (năm vào lớp 10 → ra trường sau 3 năm), đi cùng học sinh suốt 3 năm; tài khoản, điểm, huy hiệu, lịch sử điểm danh được **giữ nguyên**.
- Năm học tính từ **01/09** (giờ Việt Nam). Khối hiện tại = 10 + (năm học − năm vào lớp 10).
- **Tự đổi tên khối:** từ 01/09, Chi đoàn khóa lên lớp được đổi tên (10A1 → 11A1 → 12A1; 12/1 → 11/1...) kể cả tên lớp bên trong.
- **Ra trường:** khóa quá lớp 12 chuyển sang trạng thái **"Đã ra trường"**: đoàn viên đổi trạng thái "Đã ra trường", **tài khoản đoàn viên và bí thư bị khóa**, bí thư được gỡ; **toàn bộ dữ liệu được giữ** để tra cứu. Chi đoàn đã ra trường không còn trong danh sách chọn, bảng thi đua, thanh bên công khai.
- Chi đoàn có tên không bắt đầu bằng số khối thì không tự đổi khối.
- Chạy **tự động mỗi ngày** (cron) và Admin có nút **"Cập nhật năm học"**. Chạy lặp lại không gây hại. Chưa có nút khôi phục Chi đoàn đã ra trường.

---

## 8. Hoạt động, điểm danh, điểm, huy hiệu và thi đua

### 8.1 Hoạt động (`/activities`)
**Loại hoạt động** (Admin cấu hình, mỗi loại có điểm mặc định): mặc định gồm Tình nguyện (10), Học tập (5), Văn hóa (5), Thể thao (5), Hoạt động Đoàn (3). Không xóa được loại đang có hoạt động.

**Trường dữ liệu và giới hạn của một hoạt động:**
| Trường | Quy tắc |
|---|---|
| Tên | 3–150 ký tự |
| Mô tả | tối đa 5.000 ký tự, không bắt buộc |
| Địa điểm | 2–200 ký tự |
| Thời gian bắt đầu/kết thúc | bắt buộc, kết thúc phải sau bắt đầu |
| Loại | bắt buộc |
| Chi đoàn tổ chức | Admin chọn một Chi đoàn hoặc để **toàn trường**; bí thư luôn bị ép về Chi đoàn mình |
| Số lượng tối đa | 1–5.000, không bắt buộc |
| Điểm | 0–100, số nguyên |
| Giờ tình nguyện | 0–100 (có thể lẻ, ví dụ 3,5) |
| Ảnh | tùy chọn |

**Trạng thái:** *Sắp diễn ra* (chưa tới giờ bắt đầu), *Đang diễn ra*, *Đã kết thúc*, *Đã hủy*.

**Quy tắc nghiệp vụ:**
- Khi tạo hoạt động, hệ thống gửi thông báo "Hoạt động mới" cho đoàn viên đang sinh hoạt của Chi đoàn đó (hoặc toàn trường) và bí thư; trừ người tạo.
- Đã có người điểm danh thì **không đổi được điểm và giờ tình nguyện**, **không hủy được** và **không xóa được** (phải hủy hoạt động trước khi có điểm danh; có điểm danh rồi chỉ giữ).
- Hủy hoạt động: ghi thời điểm hủy, gửi thông báo "Hoạt động đã bị hủy" cho người đã đăng ký; hoạt động đã hủy không sửa được.
- Đổi giờ bắt đầu thì hoạt động được **nhắc lịch lại** (xem 8.3).
- Đoàn viên của Chi đoàn khác không thấy hoạt động riêng của Chi đoàn đó.

**Danh sách hoạt động:** bảng (máy tính) và danh sách gọn (điện thoại) với cột Hoạt động, Thời gian, Địa điểm, Tổ chức, Đăng ký (có "x / tối đa"), Tham gia, Trạng thái; lọc theo **Năm học → Tuần/Học kỳ**, loại, trạng thái và tìm kiếm; mặc định năm học hiện tại.

### 8.2 Đăng ký tham gia
- Đoàn viên và bí thư bấm **Đăng ký** ở trang chi tiết hoạt động khi hoạt động còn "sắp diễn ra" hoặc "đang diễn ra"; có thể **hủy đăng ký** trước khi điểm danh.
- Hết chỗ (đủ số lượng tối đa): nút bị khóa với lý do "Hoạt động đã đủ số lượng". Đã điểm danh rồi thì không hủy đăng ký được.
- Số người đăng ký và số người đã điểm danh hiển thị ở trang chi tiết.

### 8.3 Nhắc lịch tự động
Mỗi ngày (07:00 giờ Việt Nam), hệ thống gửi **thông báo và thông báo đẩy** cho người **đã đăng ký** những hoạt động bắt đầu trong vòng **24 giờ tới** và chưa bị hủy. Mỗi hoạt động chỉ nhắc **một lần**; đổi giờ bắt đầu thì được nhắc lại.

### 8.4 Điểm danh bằng mã QR
**Ai làm gì:** Admin và bí thư (đối với hoạt động của Chi đoàn mình) mở và quản lý điểm danh; đoàn viên và bí thư quét mã.

**Luồng chuẩn:**
1. Người quản lý vào **Điểm danh** (hoặc chi tiết hoạt động → quản lý điểm danh) và bấm **Mở điểm danh**. Chỉ mở được **từ 60 phút trước giờ bắt đầu đến 120 phút sau giờ kết thúc** của hoạt động.
2. Màn hình hiển thị **mã QR**. Mã chứa một token ký số chứa mã hoạt động và một "nonce"; token **hết hạn sau 90 giây** và trang tự làm mới. Bấm **"Tạo QR mới"** hoặc đóng/mở lại sẽ đổi nonce, **vô hiệu mọi mã QR cũ**.
3. Đoàn viên quét bằng camera (hoặc dán liên kết) → hệ thống mở trang xác nhận ghi tên hoạt động, họ tên, lớp → đoàn viên **bấm xác nhận** (để tránh tự ghi khi trình duyệt tải trước liên kết).
4. Máy chủ kiểm tra: mã còn hạn và đúng nonce; hoạt động chưa hủy, điểm danh đang mở và trong khung giờ cho phép; đoàn viên còn sinh hoạt; hoạt động thuộc đúng Chi đoàn của đoàn viên (hoạt động toàn trường thì mọi Chi đoàn).
5. Trong **một giao dịch duy nhất** hệ thống: ghi điểm danh (kèm thiết bị, địa chỉ IP), tạo bản ghi **cộng điểm** (điểm lấy từ hoạt động, **máy khách không gửi điểm**), cộng giờ tình nguyện (phút), gửi hai thông báo ("Điểm danh thành công", "Được cộng n điểm"), **xét và trao huy hiệu**, ghi nhật ký.
6. Một đoàn viên chỉ điểm danh **một lần** mỗi hoạt động; quét lại báo "Bạn đã điểm danh hoạt động này rồi".

**Thao tác thủ công của người quản lý:** điểm danh hộ một đoàn viên (cùng quy trình cộng điểm, ghi nhận phương thức "thủ công" và người thực hiện); **hủy điểm danh** (xóa bản ghi, ghi giao dịch điểm đối ứng âm để vẫn truy vết được, trừ lại giờ tình nguyện).
Quét QR bằng camera cần kết nối **HTTPS**.

### 8.5 Điểm rèn luyện
- Điểm đến từ hai nguồn: **điểm danh hoạt động** (theo điểm của hoạt động) và **điều chỉnh của Admin** (±100 kèm lý do). Mọi biến động được lưu thành bản ghi lịch sử (loại ACTIVITY hoặc ADJUSTMENT) để tra cứu.
- **Giờ tình nguyện** cộng dồn theo phút và hiển thị theo giờ.

### 8.6 Huy hiệu và thành tích (`/achievements`)
- Admin cấu hình huy hiệu: tên (1–60), mô tả (1–200), biểu tượng (8 mẫu: award, heart, leaf, star, trophy, flame, book-open, medal), **điều kiện** và **ngưỡng** (tối thiểu 1).
- **4 loại điều kiện:** *Số hoạt động tham gia*; *Giờ tình nguyện*; *Tổng điểm*; *Số hoạt động theo một loại* (chọn loại hoạt động).
- Mỗi lần điểm danh hoặc điều chỉnh điểm, hệ thống xét lại; đạt ngưỡng thì **tự trao** (mỗi huy hiệu một lần cho mỗi đoàn viên) và gửi thông báo "Đạt thành tích: <tên>".
- Đoàn viên xem **tiến độ từng huy hiệu** (giá trị hiện tại / ngưỡng) và danh sách đã đạt; Admin/bí thư xem danh mục huy hiệu và số người đạt; Admin thêm/sửa/xóa.

### 8.7 Thi đua giữa các Chi đoàn (`/emulation`)
**Công thức xếp hạng trong một kỳ:**
> **Tổng điểm = Điểm thi đua trường + Điểm hoạt động bình quân mỗi đoàn viên**
> trong đó *Điểm hoạt động bình quân* = (tổng điểm điểm danh của đoàn viên Chi đoàn trong kỳ) ÷ (số đoàn viên đang sinh hoạt của Chi đoàn), làm tròn 1 chữ số thập phân.

- **Điểm thi đua trường** là điểm Admin ghi nhận cho Chi đoàn (nề nếp, phong trào... có thể **âm**, từ -100 đến +100, bắt buộc có nội dung ghi nhận 3–200 ký tự và ngày ghi nhận).
- Cách tính bình quân giúp Chi đoàn đông và ít người được so sánh công bằng.
- **Sắp xếp:** theo tổng điểm giảm dần; bằng nhau xét điểm thi đua trường rồi tên; **cùng tổng điểm thì đồng hạng**.
- **Kỳ thi đua:** Tuần, Tháng (lịch dương), Học kỳ, Năm học. Tuần/học kỳ/năm học theo **lịch năm học** (mục 9.1); chọn kỳ Tuần: chọn Năm học rồi Tuần. Giá trị kỳ: tuần `2026-T03`, tháng `2026-10`, học kỳ `2026-1`, năm học `2026`.
- Chỉ **Chi đoàn đang học** được xếp hạng.
- Trang quản lý hiển thị bảng xếp hạng và **danh sách các bản ghi điểm thi đua trường** (có phân trang; Admin ghi và xóa; bí thư/đoàn viên chỉ thấy bản ghi của Chi đoàn mình). Đoàn viên và bí thư thấy Chi đoàn mình được tô nổi bật.

### 8.8 Lịch sử hoạt động cá nhân (`/history`)
Đoàn viên/bí thư xem các hoạt động mình đã **Tham gia** (kèm điểm), **Đã đăng ký** (chưa diễn ra) và **Vắng mặt** (đã đăng ký nhưng không điểm danh khi hoạt động đã kết thúc); lọc theo Năm học → Tuần, loại, trạng thái.

---

## 9. Lịch năm học và Lịch công tác tuần

### 9.1 Lịch năm học (Cài đặt → tab "Năm học", Admin)
- Giáo dục tính thời gian theo **tuần**. Với mỗi năm học Admin đặt: **ngày bắt đầu Tuần 1**, **số tuần học kỳ 1** và **tổng số tuần cả năm** (tối đa 52, lớn hơn số tuần HK1).
- **Mặc định** khi chưa đặt: Tuần 1 bắt đầu **05/09**, HK1 gồm **18 tuần**, cả năm **35 tuần**.
- Hệ thống luôn có sẵn năm học hiện tại, năm trước và năm sau (tự sinh); có thể thêm năm khác, sửa hoặc đặt lại mặc định. Form có dòng xem trước: tuần bắt đầu, tuần kết thúc HK1, khoảng HK2.
- **Mỗi tuần dài 7 ngày liên tục từ ngày Tuần 1** (không ép bắt đầu từ thứ Hai); hiển thị kèm ngày tháng, ví dụ "Tuần 1 (05/09 – 11/09)".
- **Khoảng thời gian:** *cả năm học* = từ 01/09 năm đó đến 01/09 năm sau; *học kỳ 1* = từ đầu năm học đến hết tuần HK1; *học kỳ 2* = phần còn lại.

### 9.2 Bộ lọc thời gian dùng chung
- Áp dụng cho: Hoạt động, Lịch sử hoạt động, Báo cáo (và xuất Excel), Lịch hoạt động công khai; thi đua có bộ chọn kỳ riêng cùng lịch.
- Ô **Năm học** luôn có một giá trị (mặc định năm học hiện tại, đánh dấu "(hiện tại)"); ô **Tuần** nằm giữa hai nút `‹ ›` chuyển tuần; mặc định "Cả năm học" (trang lịch hoạt động công khai và lịch công tác mặc định tuần hiện tại).
- Không còn nút "Xóa lọc"; muốn quay về mặc định thì chọn lại giá trị.

### 9.3 Lịch công tác tuần (`/schedule`, Admin)
- Chọn **Năm học → Tuần** (bộ chọn đặt cùng hàng với tiêu đề). Trang chia 7 khối theo ngày (kèm thứ và ngày/tháng).
- **Thêm công việc** cho từng ngày (nút "Thêm công việc" mỗi ngày; trên điện thoại là nút +):
  - **Thời gian (bắt buộc):** chọn bằng bộ chọn giờ: **Từ giờ** (bắt buộc), **Đến giờ** (không bắt buộc, phải sau giờ bắt đầu) hoặc tích **Cả ngày**. Dữ liệu lưu dạng "07:30", "07:30 – 09:00" hoặc "Cả ngày".
  - **Nội dung** (bắt buộc, 3–500 ký tự), **Phụ trách** (tối đa 150), **Địa điểm** (tối đa 150).
  - Ngày phải nằm trong tuần đang chọn.
- Sửa, xóa công việc; **Sao chép tuần trước** (thêm toàn bộ công việc của tuần trước sang tuần này, dời đúng 7 ngày, giữ các công việc sẵn có).
- **Công bố / Hủy công bố:** chỉ công bố được khi tuần có ít nhất một công việc; khi công bố có thể tích **"Gửi thông báo cho mọi người dùng"** (thông báo kèm đường dẫn tới đúng tuần). Công bố rồi, chỉnh sửa có hiệu lực ngay trên trang công khai.
- Nút **Xem / In bản công khai** mở trang công khai của tuần đó.
- Trên điện thoại các nút thao tác rút thành biểu tượng để gọn một hàng.

---

## 10. Nội dung và tương tác

### 10.1 Cổng thông tin: quản trị bài viết (Admin)
Nhóm menu **Cổng thông tin** (`/cms/...`):
- **Bốn loại bài:** Tin tức (`/cms/tin-tuc`), Kế hoạch (`/cms/ke-hoach`), Sự kiện (`/cms/su-kien`), Thông báo (`/cms/thong-bao`).
- **Danh sách** có tìm kiếm tiêu đề, phân trang; cột Tiêu đề, **Người đăng**, Ngày tạo, Trạng thái, thao tác. Trạng thái: **Hiển thị**, **Nháp**, **Chờ duyệt** (nháp của bí thư).
- **Trường của bài:**
  | Trường | Quy tắc |
  |---|---|
  | Trạng thái | Hiển thị công khai hoặc Nháp |
  | Tiêu đề | 3–200 ký tự |
  | Thời gian diễn ra, Địa điểm | chỉ Sự kiện; **Sự kiện bắt buộc có thời gian**; địa điểm tối đa 200 |
  | Tóm tắt | tối đa 500 ký tự, hiện ở danh sách và trang chủ |
  | Nội dung | 1–50.000 ký tự, định dạng đơn giản |
  | Ảnh bìa | tải ảnh JPG/PNG/WebP tối đa 5MB |
  | Tệp đính kèm | tối đa **10 tệp**; mỗi tệp PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, tối đa **10MB**; người xem xem trực tiếp hoặc tải về |
- Mỗi bài có đường dẫn (slug) duy nhất sinh từ tiêu đề; thời điểm đăng được ghi khi bài được hiển thị lần đầu.
- Khi Admin **đăng Thông báo** ở trạng thái hiển thị, hệ thống gửi thông báo "Thông báo mới từ Đoàn trường" cho mọi tài khoản đang hoạt động.
- **Trang chi tiết quản lý** (`/cms/<loại>/<id>`): hiển thị đầy đủ bài (một hàng "trạng thái · ngày tạo · người đăng", thời gian/địa điểm sự kiện ở hàng dưới), các nút Xem công khai, Ẩn/Hiện, Sửa, Xóa; xóa bài xóa luôn ảnh và tệp trên Cloudinary.
- **Trang giới thiệu** (`/cms/pages`): soạn nội dung 4 trang giới thiệu.
- **Báo cáo Chi đoàn** (`/chapter-reports`): xem mục 10.2.
- **Dòng chữ chạy** (`/cms/marquee`): thêm thông điệp (2–300 ký tự, kèm liên kết bắt đầu bằng `/` hoặc `https://`), bật/tắt, đổi thứ tự, xóa. Chưa có thông điệp nào thì dùng câu chào mặc định.
- **Menu website** (`/cms/menu`): Admin đổi tên, ẩn/hiện, sắp xếp, thêm/xóa mục tự thêm cho thanh menu phía trên (kèm mục con thả xuống) và các nhóm ở thanh bên trái (chuyển mục giữa các nhóm, thêm nhóm). Mục có sẵn chỉ đổi tên/ẩn, không xóa; nhóm Báo cáo Chi đoàn vẫn tự liệt kê Khối → lớp. Lưu trong `SiteSetting` khóa `menuConfig`; có nút Khôi phục mặc định.
- **Thông tin website** (`/cms/settings`): địa chỉ, điện thoại, email, **Facebook**, **YouTube** (phải bắt đầu `https://`), **ảnh banner**, và **Đếm ngược** (tên sự kiện, thời điểm theo giờ Việt Nam, liên kết). Ô trống thì phần tương ứng ẩn; địa chỉ, điện thoại, email cũng hiện ở chân trang.

### 10.2 Báo cáo Chi đoàn
- Bí thư/Admin đăng báo cáo của Chi đoàn: tiêu đề (3–200), nội dung (tối đa 50.000), ảnh tùy chọn. Bí thư bị ép về Chi đoàn mình, Admin chọn Chi đoàn.
- Báo cáo **hiển thị công khai ngay** (không qua duyệt) ở mục Báo cáo Chi đoàn; bí thư chỉ sửa/xóa báo cáo của Chi đoàn mình.
- Trang quản lý `/chapter-reports` có danh sách, trang chi tiết (Xem công khai, Sửa, Xóa) và biểu mẫu đăng/sửa.

### 10.3 Quy trình duyệt bài của bí thư và Hàng chờ duyệt
1. Bí thư soạn bài Tin tức/Kế hoạch/Sự kiện/Thông báo ở menu **Cổng thông tin**; biểu mẫu không có ô trạng thái, nút lưu là **"Lưu bản nháp"**. **Máy chủ ép bài thành nháp** dù gửi gì.
2. Hệ thống gửi thông báo **"Bài viết chờ duyệt"** (kèm tên bí thư, tiêu đề) tới mọi Admin.
3. Bí thư chỉ thấy, sửa, xóa **bản nháp của chính mình**; bài đã đăng thì chỉ xem. Muốn sửa bài đã đăng phải nhờ Admin ẩn bài trước.
4. Admin vào **Hàng chờ duyệt** (`/approvals`): trang gom ba mục:
   - **Bài viết bí thư gửi chờ duyệt:** tiêu đề (bấm để xem/sửa), loại bài, tên bí thư và Chi đoàn, thời điểm; nút **"Duyệt & đăng"** (hiện công khai ngay).
   - **Góp ý chưa xem** (trạng thái Mới).
   - **Báo cáo Chi đoàn mới trong 7 ngày** (để theo dõi).
   Đầu trang có ba số tổng hợp; menu bên trái có **huy hiệu số việc đang chờ** (bài chờ duyệt + góp ý mới).

### 10.4 Bảng tin nội bộ (`/feed`)
- **Bài đăng** có nội dung (1–5.000 ký tự) và một ảnh tùy chọn, thuộc **toàn trường** (Admin) hoặc **một Chi đoàn**. Admin đăng cho toàn trường hoặc Chi đoàn bất kỳ; bí thư chỉ đăng trong Chi đoàn mình. Đoàn viên **không đăng được**.
- **Phạm vi xem:** bài toàn trường mọi người thấy; bài của Chi đoàn chỉ thành viên Chi đoàn (và Admin) thấy.
- Đăng bài có trang riêng "Đăng bài"; khi có bài mới hệ thống gửi thông báo "<tên> đã đăng bài mới" cho đối tượng xem được (trừ người đăng).
- Mọi người dùng **thích** và **bình luận** (1–1.000 ký tự); người đăng, bí thư Chi đoàn và Admin xóa được bài; người viết hoặc người có quyền quản lý xóa được bình luận. Bình luận cũng gửi thông báo cho chủ bài.

### 10.5 Hộp thư góp ý ẩn danh
- **Trang công khai** `/gop-y` (không cần đăng nhập): chọn **chủ đề** (Hoạt động Đoàn, Học tập, Cơ sở vật chất, Đề xuất ý tưởng, Khác), nhập **nội dung** (10–2.000 ký tự), **cách liên hệ** tùy chọn (tối đa 120 ký tự). **Không lưu danh tính người gửi.**
- **Chống spam:** một ô bẫy ẩn dành cho chương trình tự động; tổng số góp ý bị giới hạn **30 góp ý mỗi giờ** cho cả hệ thống.
- Gửi xong hiện lời cảm ơn; Admin nhận thông báo "Có góp ý mới".
- **Quản lý (Admin)** (`/feedback`): danh sách có lọc theo trạng thái; trạng thái **Mới → Đã xem → Đã xử lý**; mở xem một góp ý tự chuyển "Mới" sang "Đã xem"; ghi **ghi chú xử lý** (chỉ Admin thấy, tối đa 1.000 ký tự); xóa góp ý.

### 10.6 Bình chọn (`/polls`)
- **Admin tạo:** câu hỏi (5–200 ký tự), mô tả (tối đa 500), **2 đến 10 lựa chọn** (không trùng nhau), tùy chọn **cho chọn nhiều**, tùy chọn **hạn bình chọn** (phải ở tương lai).
- **Mọi tài khoản đăng nhập** bỏ phiếu: mỗi người một bộ phiếu cho mỗi bình chọn; **đổi được lựa chọn** khi chưa kết thúc. Sau khi bỏ phiếu hiện **kết quả dạng thanh phần trăm** kèm số phiếu, đánh dấu lựa chọn của mình và lựa chọn dẫn đầu. Bình chọn đã kết thúc: chỉ xem kết quả.
- Bình chọn **kết thúc** khi quá hạn hoặc khi Admin bấm Kết thúc; có thể **mở lại** hoặc **xóa** (xóa toàn bộ phiếu).
- Tạo bình chọn gửi thông báo "Bình chọn mới" cho mọi người dùng.

### 10.7 Trò chơi tích điểm (`/games`, quản lý ở `/quizzes`)
Đố vui hằng tuần do Ban chấp hành soạn; đoàn viên (và bí thư) chơi để **tích điểm**, điểm **cộng vào điểm thi đua Chi đoàn** nhưng có **trần mỗi tuần**.

- **Dạng câu hỏi:** trắc nghiệm (2–5 lựa chọn), đúng/sai, điền từ (có thể kèm hình để "đuổi hình bắt chữ", chấp nhận nhiều đáp án, không phân biệt hoa thường và dấu), sắp xếp thứ tự (3–6 mục). Một bộ có 3–30 câu, có thể trộn nhiều dạng.
- **Cách chơi:** mỗi câu có **đồng hồ đếm ngược** (10–60 giây, tính ở máy chủ), hết giờ là sai; hiện đúng/sai ngay kèm lời giải thích; có **chuỗi đúng liên tiếp 🔥**, thanh tiến độ, âm thanh (tắt được), pháo giấy khi về đích, xếp hạng sao. Mỗi bộ **chỉ chơi một lần**; đóng trang giữa chừng thì lần sau chơi tiếp, câu quá giờ tính sai.
- **Chống gian lận:** đáp án **không gửi xuống máy khách** trước khi trả lời; máy chủ chấm từng câu, tự tính giờ (đồng hồ của mỗi câu chỉ chạy từ lúc câu được gửi đi), chống trả lời trùng và chống đọc lượt chơi của người khác.
- **Điểm:** điểm đạt = điểm tối đa của bộ (0–20) × số câu đúng ÷ tổng số câu (làm tròn). Điểm thực nhận = min(điểm đạt, trần tuần còn lại). **Trần điểm trò chơi mỗi đoàn viên mỗi tuần** do Admin đặt (mặc định 10, tuần tính từ 00:00 thứ Hai giờ Việt Nam). Điểm ghi thành bản ghi `PointTransaction` loại **GAME** nên tự động vào tổng điểm, điểm thi đua Chi đoàn (công thức mục 8.7) và xét huy hiệu; có điều kiện huy hiệu mới **"Số trò chơi đã hoàn thành"**.
- **Hiển thị trên cổng thông tin:** các trò đang mở xuất hiện ở trang công khai **Trò chơi** (`/tro-choi`, mục "Góc học sinh") và khối "Trò chơi" ở trang chủ. Khách bấm vào sẽ được mời **đăng nhập** (xong quay lại đúng trò); đoàn viên đăng nhập **chơi ngay tại cổng thông tin**, điểm tính như khi chơi trong hệ thống quản lý. Không còn loại bài "Trò chơi nhúng" (Wordwall, Kahoot…).
- **Trang đoàn viên:** thanh tiến độ điểm trò chơi tuần này, bảng "Cao thủ tuần này" (top 5), thẻ từng trò (chơi ngay / đang chơi dở / đã chơi + điểm / đã kết thúc).
- **Trang quản lý (Admin / Ban chấp hành):** tạo, sửa, ẩn/mở, xóa; nút **"Tạo câu hỏi bằng AI"** (nhập chủ đề, AI soạn sẵn câu hỏi để sửa); đặt **trần điểm tuần**; xem kết quả (số lượt, tỉ lệ đúng, độ khó từng câu, bảng xếp hạng). Khi đã có người chơi, câu hỏi, điểm và thời gian được **khóa** để công bằng. Tạo trò chơi mới có thể gửi thông báo cho mọi đoàn viên.
- **Dữ liệu:** `Quiz`, `QuizQuestion`, `QuizAttempt` (duy nhất theo bộ + đoàn viên), `QuizAnswer`.

---

## 11. Thông báo

### 11.1 Hai kênh
- **Trung tâm thông báo trong ứng dụng:** chuông ở thanh trên, hiện số chưa đọc, danh sách 10 thông báo mới nhất, đánh dấu từng cái hoặc tất cả là đã đọc; bấm thông báo mở trang liên quan.
- **Thông báo đẩy (Web Push)** tới điện thoại/máy tính đã đăng ký, có âm thanh (có thể tắt). Người dùng bật ở Cài đặt → Thông báo; hệ thống gửi đẩy **sau khi** phản hồi đã trả để không làm chậm thao tác.

### 11.2 Danh mục thông báo
| Loại | Khi nào gửi | Gửi cho |
|---|---|---|
| Hoạt động mới | Tạo hoạt động | Đoàn viên của Chi đoàn (hoặc toàn trường) và bí thư, trừ người tạo |
| Nhắc lịch | Hoạt động bắt đầu trong 24 giờ | Người đã đăng ký |
| Hoạt động bị hủy | Hủy hoạt động | Người đã đăng ký |
| Điểm danh thành công | Điểm danh (QR hoặc thủ công) | Đoàn viên đó |
| Được cộng điểm | Điểm danh có điểm | Đoàn viên đó |
| Đạt thành tích | Đạt điều kiện huy hiệu | Đoàn viên đó |
| Bài đăng bảng tin | Đăng bài | Đối tượng xem được, trừ người đăng |
| Bình luận | Có bình luận mới | Chủ bài |
| Bình chọn mới | Admin tạo bình chọn | Mọi người dùng |
| Thông báo mới từ Đoàn trường | Admin đăng bài loại Thông báo | Mọi người dùng |
| Bài viết chờ duyệt | Bí thư lưu bản nháp mới | Các Admin |
| Có góp ý mới | Học sinh gửi góp ý | Các Admin |
| Lịch công tác | Admin công bố lịch kèm gửi thông báo | Mọi người dùng |

---

## 12. Báo cáo và xuất dữ liệu (`/reports`)

- **Báo cáo hoạt động:** danh sách hoạt động đã diễn ra (không hủy) với Loại, Thời gian, Tổ chức, số **Đăng ký**, số **Tham gia**, **Tỷ lệ** tham gia (so với quy mô phạm vi: Chi đoàn hoặc toàn trường); lọc theo **Năm học → Tuần/Học kỳ**.
- **Xếp hạng Chi đoàn theo tỷ lệ tham gia** (Admin).
- **Xuất Excel (Admin):** một tệp hai trang tính — *Hoạt động* (Hoạt động, Loại, Thời gian, Tổ chức, Đăng ký, Tham gia, Tỷ lệ %) và *Đoàn viên* (Mã, Họ tên, Lớp, Chi đoàn, số hoạt động, Điểm, Giờ tình nguyện, số Huy hiệu); tên tệp kèm năm học và tuần đang lọc.
- Trang **Báo cáo** chỉ dành cho Admin. Bí thư theo dõi Chi đoàn mình qua trang Tổng quan, Hoạt động, Điểm danh và Thi đua.

---

## 13. Cài đặt (`/settings`)

Trang chia thành **tab** (chọn bằng địa chỉ `?tab=`), chỉ nạp dữ liệu của tab đang mở:

| Tab | Ai thấy | Nội dung |
|---|---|---|
| Tài khoản | Mọi người | Ảnh đại diện (đổi được), họ tên (Admin sửa được), tên đăng nhập, mã đoàn viên, vai trò, Chi đoàn |
| Thông báo | Mọi người | Bật thông báo đẩy, bật/tắt âm thanh |
| Mật khẩu | Mọi người | Đổi mật khẩu |
| Đăng nhập nhanh | Mọi người | Bật/xóa vân tay, khuôn mặt (passkey) trên từng thiết bị |
| Năm học | Admin | Lịch năm học (mục 9.1) |
| Loại hoạt động | Admin | Thêm/sửa/xóa loại và điểm mặc định |
| Nhật ký | Admin | 30 thao tác gần nhất (thời gian, người thực hiện, hành động, đối tượng) |
| Ban chấp hành | Chỉ Quản trị hệ thống | Cấp tài khoản cho Bí thư, Phó Bí thư, Ủy viên Ban chấp hành Đoàn trường; sửa họ tên và chức danh; cấp lại mật khẩu tạm; thu hồi và cấp lại quyền |
| Dữ liệu | Admin | Dung lượng database, bảng lớn nhất, chính sách giữ dữ liệu, nút **Dọn ngay** |

---

## 14. Mô hình dữ liệu (từ điển dữ liệu)

Các bảng chính và trường quan trọng (mọi bảng đều có mã định danh tự sinh `id`):

**User (Tài khoản):** username (duy nhất), mật khẩu băm, họ tên, **vai trò** (ADMIN/SECRETARY/MEMBER), **trạng thái** (ACTIVE/LOCKED), bắt buộc đổi mật khẩu, ảnh đại diện (cho tài khoản không có hồ sơ), lần đăng nhập cuối.

**Member (Hồ sơ đoàn viên):** mã đoàn viên (duy nhất), tài khoản (một-một), họ tên, giới tính, ngày sinh, ngày vào Đoàn, khóa, **trạng thái** (ACTIVE/TRANSFERRED/GRADUATED), lớp, Chi đoàn, ảnh, mã QR định danh ngẫu nhiên, **tổng điểm**, **số phút tình nguyện**.

**Department (Chi đoàn):** tên (hiện tại, tự đổi theo năm học), mô tả, **năm vào lớp 10** (khóa), thời điểm ra trường, bí thư (một tài khoản, tối đa một Chi đoàn). Ràng buộc: duy nhất theo (tên, khóa).
**Class (Lớp):** tên, khối, Chi đoàn; duy nhất theo (Chi đoàn, tên).

**ActivityCategory:** tên (duy nhất), điểm mặc định.
**Activity:** tên, mô tả, địa điểm, bắt đầu, kết thúc, loại, Chi đoàn (trống = toàn trường), số lượng tối đa, điểm, giờ tình nguyện, ảnh, thời điểm hủy, thời điểm đã nhắc lịch, cờ mở điểm danh, **nonce QR**, người tạo.
**ActivityImage:** ảnh phụ của hoạt động.
**ActivityRegistration:** hoạt động, đoàn viên, trạng thái (REGISTERED/CANCELLED); duy nhất theo (hoạt động, đoàn viên).
**Attendance:** hoạt động, đoàn viên, thời điểm, **phương thức** (QR/MANUAL), thiết bị, IP, (dự phòng tọa độ), người điểm danh hộ; duy nhất theo (hoạt động, đoàn viên).
**PointTransaction:** đoàn viên, hoạt động, điểm danh (một-một, tùy chọn), **loại** (ACTIVITY/ADJUSTMENT), số điểm (có thể âm), lý do, người tạo.

**Badge:** tên (duy nhất), mô tả, biểu tượng, **điều kiện** (ACTIVITY_COUNT/VOLUNTEER_HOURS/TOTAL_POINTS/CATEGORY_COUNT), ngưỡng, loại hoạt động (cho điều kiện theo loại). **MemberBadge:** đoàn viên, huy hiệu, thời điểm trao; duy nhất theo (đoàn viên, huy hiệu).

**EmulationRecord:** Chi đoàn, điểm (± ), lý do, ngày ghi nhận, người tạo.

**Post / PostLike / PostComment:** bài bảng tin (tác giả, Chi đoàn hoặc toàn trường, nội dung, ảnh), lượt thích (duy nhất theo bài + người), bình luận.
**Poll / PollOption / PollVote:** câu hỏi, chọn nhiều, hạn, đã kết thúc; lựa chọn có thứ tự; phiếu duy nhất theo (bình chọn, người, lựa chọn).
**Feedback:** chủ đề, nội dung, cách liên hệ, trạng thái (NEW/READ/RESOLVED), ghi chú xử lý. Không có trường định danh người gửi.

**Article:** **loại** (NEWS/PLAN/EVENT/ANNOUNCEMENT), tiêu đề, **slug duy nhất**, tóm tắt, nội dung, ảnh bìa, thời gian và địa điểm (sự kiện), hiển thị hay nháp, thời điểm đăng, tác giả. **ArticleAttachment:** tên, địa chỉ, mã Cloudinary, dung lượng, kiểu.
**SitePage:** trang giới thiệu (slug, tiêu đề, nội dung). **SiteSetting:** cặp khóa-giá trị (địa chỉ, điện thoại, email, Facebook, YouTube, banner, đếm ngược). **MarqueeItem:** chữ chạy (nội dung, liên kết, bật/tắt, thứ tự). **ChapterReport:** báo cáo Chi đoàn (Chi đoàn, tiêu đề, nội dung, ảnh, người đăng).

**SchoolYear:** năm học (khóa chính), ngày Tuần 1, số tuần HK1, tổng số tuần.
**WeeklySchedule:** (năm học, tuần) duy nhất, đã công bố hay chưa. **WeeklyScheduleItem:** ngày, thời gian, nội dung, phụ trách, địa điểm, thứ tự.

**Notification:** người nhận, loại, tiêu đề, nội dung, liên kết, thời điểm đọc. **PushSubscription:** thiết bị đã đăng ký đẩy (endpoint duy nhất). **AuditLog:** người, hành động, đối tượng, mã đối tượng, thông tin kèm, IP, thời điểm.

**Quan hệ chính:** một Chi đoàn có nhiều lớp, nhiều đoàn viên, nhiều hoạt động, một bí thư. Một đoàn viên có một tài khoản, nhiều đăng ký, điểm danh, bản ghi điểm, huy hiệu. Một hoạt động có nhiều đăng ký và điểm danh.
**Hành vi khi xóa:** xóa tài khoản xóa theo hồ sơ và dữ liệu cá nhân liên quan; xóa Chi đoàn xóa lớp và hoạt động của nó (chỉ cho phép khi không còn đoàn viên); một số liên kết "người tạo" chuyển về trống để giữ dữ liệu lịch sử.

---

## 15. Tác vụ tự động, dọn dữ liệu và dung lượng

### 15.1 Ba tác vụ hằng ngày (Vercel Cron, bảo vệ bằng `CRON_SECRET`)
| Tác vụ | Giờ chạy (giờ Việt Nam) | Việc làm |
|---|---|---|
| Nhắc lịch (`/api/cron/reminders`) | 07:00 | Gửi thông báo và đẩy cho người đã đăng ký hoạt động bắt đầu trong 24 giờ tới (mỗi hoạt động một lần) |
| Chuyển năm học (`/api/cron/rollover`) | 07:10 | Bổ sung khóa cho Chi đoàn cũ; đổi tên khối theo năm học; cho khóa quá lớp 12 ra trường và khóa tài khoản |
| Dọn dữ liệu (`/api/cron/cleanup`) | 01:30 | Xóa thông báo cũ và nhật ký cũ (mục 15.2) |

Cả ba chạy lặp lại không gây hại. Gói Vercel miễn phí chỉ cho cron chạy tối đa mỗi ngày một lần.

### 15.2 Chính sách giữ dữ liệu
| Loại | Thời gian giữ |
|---|---|
| Thông báo **đã đọc** | **90 ngày** |
| Thông báo **chưa đọc** | **120 ngày** |
| Nhật ký hệ thống | **120 ngày** |
| Điểm danh, lịch sử điểm, huy hiệu, đăng ký, báo cáo, bài viết, hồ sơ | **Lâu dài** (không tự xóa) |

Admin xem dung lượng và bấm **Dọn ngay** ở Cài đặt → Dữ liệu.

### 15.3 Dung lượng và sức chịu tải (ước tính cho khoảng 1.400 đoàn viên)
- Dữ liệu lâu dài tăng khoảng **55MB mỗi năm**; thông báo và nhật ký có trần khoảng 25MB nhờ việc dọn. Gói database **500MB dùng được khoảng 7–8 năm** (dè dặt 4–5 năm). Ảnh và tệp ở Cloudinary không tính vào đó.
- Với kết nối "pooled", cao điểm **điểm danh QR của cả trường** (khoảng 5–50 yêu cầu mỗi giây trong vài phút) được xử lý ổn. Các trang công khai nhẹ nhờ lưu đệm.

---

## 16. Bảo mật, khởi tạo và dữ liệu mẫu

### 16.1 Bảo mật
- **Phân quyền ở máy chủ** cho mọi truy vấn và thao tác; chống truy cập chéo giữa các Chi đoàn.
- Mật khẩu băm bcrypt; mật khẩu tạm bắt buộc đổi; giới hạn đăng nhập sai; khóa tài khoản có hiệu lực ngay; thông báo lỗi không lộ tài khoản có tồn tại.
- **Mã QR điểm danh:** token ký số hết hạn 90 giây, vô hiệu mã cũ bằng nonce; điểm do máy chủ tính từ hoạt động, không nhận từ máy khách; ghi điểm danh và cộng điểm trong một giao dịch nên không thể "cộng điểm" mà không có điểm danh.
- **Tải tệp:** kiểm tra định dạng, dung lượng, quyền (tệp tài liệu chỉ Admin tải); chỉ chấp nhận ảnh/tệp trong thư mục của hệ thống trên Cloudinary.
- **Góp ý ẩn danh:** không lưu danh tính; chống spam bằng ô bẫy và giới hạn theo giờ.
- **Nhật ký thao tác** ghi các việc quan trọng: đăng nhập, đổi mật khẩu, tạo/sửa/xóa đoàn viên, Chi đoàn, hoạt động, bài viết, báo cáo, điểm danh, hủy điểm danh, điều chỉnh điểm, nhập Excel, bầu/gỡ bí thư, chuyển năm học, lịch năm học, lịch công tác, bình chọn, góp ý, cài đặt, dọn dữ liệu... (giữ 120 ngày).
- Các biến bí mật (`AUTH_SECRET`, khóa Cloudinary, khóa VAPID, `CRON_SECRET`) chỉ nằm ở môi trường máy chủ.

### 16.2 Khởi tạo khi triển khai
- Lệnh build trên Vercel tự: sinh Prisma → cập nhật cấu trúc database → chạy khởi tạo → build Next.js.
- **Khởi tạo** chỉ làm việc khi database **chưa có người dùng nào**: tạo các loại hoạt động mặc định và **một tài khoản Admin** (`ADMIN_USERNAME`, mặc định `admin`) với mật khẩu từ `ADMIN_INITIAL_PASSWORD` hoặc mật khẩu ngẫu nhiên in một lần ở log build; bắt buộc đổi mật khẩu lần đầu. Không bao giờ xóa dữ liệu đã có.
- Đặt `SEED_DEMO=true` ở lần deploy đầu để nạp **dữ liệu demo**: 3 Chi đoàn (10A1, 11A1, 12A1) với 3 bí thư, 30 đoàn viên, 10 hoạt động, huy hiệu mẫu, bài viết mẫu (tin tức, kế hoạch, sự kiện, thông báo kèm ảnh minh họa), báo cáo Chi đoàn, dòng chữ chạy, thông tin liên hệ. Mật khẩu demo chung `Doan@2026`; tài khoản demo: `admin`, `bithu.10a1`, `bithu.11a1`, `bithu.12a1` và `SH20260001`…
- Lệnh nạp dữ liệu demo đầy đủ bị chặn trên môi trường thật trừ khi đặt biến xác nhận.

---

## 17. Hạn chế hiện tại và hướng phát triển

**Chưa có / còn hạn chế:**
- Không gửi email, nên không có "quên mật khẩu" tự động (Admin cấp lại mật khẩu tạm).
- Chưa có chức năng xin phép vắng có duyệt.
- Chưa có giấy chứng nhận PDF, thư viện ảnh/video, màn hình sự kiện chiếu trực tiếp.
- Chưa có nút khôi phục Chi đoàn đã ra trường nhầm (cần mở khóa thủ công trong database).
- Giới hạn đăng nhập sai lưu trong bộ nhớ từng máy chủ nên không đồng bộ giữa nhiều bản sao.
- Quét QR bằng camera cần HTTPS.
- Báo cáo Chi đoàn đăng công khai ngay, chưa qua duyệt; lịch công tác chưa có bản PDF riêng (chỉ in từ trình duyệt).

**Gợi ý phát triển:** màn hình sự kiện trực tiếp (QR + số người vào thời gian thực), tổng kết "Hành trình Đoàn viên" cuối năm, nhiệm vụ tuần và cấp độ, cảnh báo đoàn viên lâu không tham gia, giấy chứng nhận có mã QR xác thực, thư viện ảnh hoạt động, trợ lý hỏi đáp, sao lưu/xuất toàn bộ dữ liệu định kỳ.

---

## 18. Thuật ngữ

| Thuật ngữ | Nghĩa |
|---|---|
| Đoàn viên | Học sinh là thành viên Đoàn TNCS Hồ Chí Minh |
| Chi đoàn | Đơn vị cơ sở gắn với một lớp/khóa, ví dụ 10A1, 12/1 |
| Bí thư | Đoàn viên được bầu đứng đầu Chi đoàn, được Admin gán vai trò |
| Admin / BCH Đoàn trường | Quản trị viên, đại diện Ban chấp hành Đoàn trường |
| Niên khóa | Khoảng 3 năm học của một khóa, ví dụ 2026–2029 |
| Năm học | Tính từ 01/09; ví dụ năm học 2026–2027 có "năm bắt đầu" 2026 |
| Tuần (của năm học) | 7 ngày liên tục tính từ ngày bắt đầu Tuần 1 do Admin đặt |
| Điểm danh QR | Ghi nhận tham gia hoạt động bằng cách quét mã QR hết hạn nhanh |
| Nonce | Mã ngẫu nhiên của hoạt động; đổi để vô hiệu mọi mã QR cũ |
| Điểm thi đua trường | Điểm Admin ghi nhận cho Chi đoàn (có thể âm) |
| Điểm hoạt động bình quân | Tổng điểm điểm danh của Chi đoàn chia số đoàn viên |
| Huy hiệu | Phần thưởng tự trao khi đạt điều kiện (số hoạt động, giờ, điểm, loại) |
| Cổng thông tin | Phần website công khai của Đoàn trường và khu quản trị nội dung của nó |
| Hàng chờ duyệt | Trang gom các việc đang chờ Admin xử lý |
| Bản nháp | Bài chưa hiển thị công khai |
| Skeleton (khung chờ) | Khung xám hiển thị trong lúc trang đang tải |
| PWA | Ứng dụng web cài được lên màn hình điện thoại |
| Web Push | Thông báo đẩy từ máy chủ tới thiết bị |
| Cron | Tác vụ tự chạy theo lịch hằng ngày |
| Pooler | Bộ gom kết nối database giúp chịu nhiều truy cập đồng thời |

---

## 19. Câu hỏi thường gặp

**Bí thư có phải một tài khoản riêng không?** Không. Bí thư là một đoàn viên được Admin gán thêm vai trò; dùng chung tài khoản đoàn viên, có thể quét QR điểm danh và xem hồ sơ như mọi đoàn viên, đồng thời quản lý Chi đoàn mình.

**Đoàn viên đăng nhập bằng gì?** Mã đoàn viên (dạng SH20260001) cùng mật khẩu; lần đầu dùng mật khẩu tạm và bắt buộc đổi.

**Khi lên lớp có phải tạo lại Chi đoàn và tài khoản không?** Không. Chi đoàn và tài khoản đi cùng suốt 3 năm; tên khối tự đổi từ 01/09; sau lớp 12 Chi đoàn chuyển sang "Đã ra trường" và tài khoản bị khóa nhưng dữ liệu vẫn giữ.

**Điểm danh có thể gian lận không?** Mã QR hết hạn sau 90 giây và đổi được ngay; đoàn viên phải bấm xác nhận; mỗi người chỉ một lần mỗi hoạt động; điểm do máy chủ tính, không nhận từ thiết bị; mọi việc đều có nhật ký.

**Bí thư đăng bài lên website thế nào?** Soạn ở nhóm Cổng thông tin, lưu thành bản nháp; Admin nhận thông báo, vào Hàng chờ duyệt và bấm "Duyệt & đăng" thì bài hiện công khai. Báo cáo Chi đoàn thì đăng trực tiếp.

**Học sinh góp ý có bị lộ tên không?** Không. Trang góp ý không cần đăng nhập và hệ thống không lưu danh tính người gửi.

**Lịch công tác khác lịch hoạt động ở đâu?** Lịch hoạt động tự tổng hợp từ các hoạt động đã tạo (có đăng ký, điểm danh, điểm). Lịch công tác là lịch **do Admin soạn tay** theo từng ngày trong tuần (ai làm gì, ở đâu), có công bố và in.

**Tuần học được tính thế nào?** Admin đặt ngày bắt đầu Tuần 1 của năm học (mặc định 05/09) và số tuần; mỗi tuần dài 7 ngày liên tục. Tất cả bộ lọc "Năm học → Tuần" và thi đua theo tuần dùng lịch này.

**Dữ liệu nào bị xóa tự động?** Chỉ thông báo cũ (đã đọc quá 90 ngày, chưa đọc quá 120 ngày) và nhật ký hệ thống quá 120 ngày. Điểm danh, điểm, huy hiệu, báo cáo, bài viết được giữ lâu dài.

**Hệ thống chịu được bao nhiêu người dùng cùng lúc?** Với khoảng 1.400 đoàn viên và kết nối database dạng "pooled", hệ thống chịu được cao điểm điểm danh QR của cả trường; các trang công khai nhẹ nhờ lưu đệm.

## Tình nguyện (đăng ký theo Chi đoàn, có duyệt)

- **Bí thư gửi đăng ký cho cả Chi đoàn** (menu *Hoạt động → Tình nguyện*, nút **Đăng ký tình nguyện**): chọn công việc (gợi ý Quét sân, Vệ sinh khu vực lớp, Nhặt rác…, hoặc tự gõ), ngày, giờ bắt đầu/kết thúc, khu vực, **số giờ tình nguyện mỗi em** (tự tính theo khung giờ, sửa được, tối đa 12 giờ) và **điểm mỗi em** (tối đa 20). Không giới hạn số Chi đoàn cùng đăng ký một công việc.
- Đăng ký ở trạng thái **Chờ duyệt**: Admin nhận thông báo, thấy ở **Hàng chờ duyệt** (và trang *Tình nguyện*), bấm **Duyệt** hoặc **Từ chối** (kèm lý do, bí thư nhận thông báo). Bí thư **rút lại** được khi còn chờ duyệt. Admin đăng ký thay một Chi đoàn thì được duyệt luôn.
- Khi **duyệt**, hệ thống tạo một hoạt động loại **"Tình nguyện"** của Chi đoàn, **tự đăng ký mọi đoàn viên** đang sinh hoạt và gửi thông báo cho các em và bí thư. Chỉ lúc này mới hiện trên lịch công khai và điểm danh được.
- Đến ngày, **điểm danh như hoạt động thường** (quét QR hoặc điểm danh hộ): mỗi em có mặt được cộng điểm và giờ tình nguyện. Bí thư sửa hoặc hủy ở trang chi tiết hoạt động.
- **Trang công khai Lịch tình nguyện** (`/tinh-nguyen`): lịch theo ngày gồm các buổi **đã duyệt**, sắp tới và 14 ngày gần đây (lớp nào, làm gì, giờ nào, ở đâu). Bí thư và Admin có nút đăng ký ngay trên trang.

## Trang giới thiệu nhiều tab

Các trang trong mục Giới thiệu (Đoàn trường, BCH, Cơ cấu tổ chức, Cờ đỏ, Nội quy) soạn ở *Cài đặt → Trang giới thiệu*. Mỗi trang có thể là **một nội dung** hoặc được **chia thành nhiều tab** (nút **Chia thành nhiều tab**): mỗi tab có tên và nội dung riêng (ví dụ Nội quy: *Đoàn viên*, *Lớp học*, *Nhà trường*). Có thể thêm (tối đa 10), đổi tên, đổi thứ tự, xóa tab, hoặc **Gộp lại một trang**. Trang công khai hiện thanh tab; địa chỉ có `?tab=N` để chia sẻ đúng tab.
