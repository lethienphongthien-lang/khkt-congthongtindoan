# Sơ đồ trang (Sitemap) – Hệ thống Cổng thông tin & quản lý Đoàn – Trường THPT Sơn Hà

Hệ thống có **3 khu vực**: (A) Cổng công khai, (B) Đăng nhập & tài khoản, (C) Khu quản trị theo vai trò. Ký hiệu: 🌐 công khai · 🔐 cần đăng nhập · 👑 Admin/Ban chấp hành · 🧑‍💼 Bí thư Chi đoàn · 🎓 Đoàn viên/Thanh niên.

---

## A. Cổng công khai (không cần đăng nhập)

```
/                                   Trang chủ (banner, chữ chạy, tin nổi bật, sự kiện, thi đua, trò chơi, chatbot AI)
├── Giới thiệu
│   ├── /gioi-thieu/doan-truong      Đoàn trường
│   ├── /gioi-thieu/bch-doan-truong  BCH Đoàn trường
│   ├── /gioi-thieu/co-cau-to-chuc   Cơ cấu tổ chức
│   ├── /gioi-thieu/co-do            Cờ đỏ
│   └── /gioi-thieu/noi-quy          Nội quy
├── Tin tức & hoạt động
│   ├── /tin-tuc                     Tin tức
│   ├── /ke-hoach                    Kế hoạch (tab theo danh mục)
│   ├── /su-kien                     Sự kiện
│   ├── /thong-bao                   Thông báo
│   └── /bai-viet/[slug]             Chi tiết một bài viết (dùng chung cho mọi loại bài)
├── Lịch
│   ├── /lich-hoat-dong              Lịch hoạt động
│   └── /lich-cong-tac               Lịch công tác tuần
├── Báo cáo Chi đoàn
│   ├── /bao-cao-chi-doan            Danh sách theo Khối/Lớp và nhóm "Chi đoàn giáo viên" (?khoi=gv)
│   ├── /bao-cao-chi-doan/[id]       Báo cáo của một Chi đoàn
│   └── /bao-cao-chi-doan/bao-cao/[reportId]   Chi tiết một báo cáo
├── Thi đua
│   ├── /thi-dua                     Bảng thi đua tháng
│   ├── /thi-dua/thanh-tich          Thành tích
│   └── /thi-dua/chi-doan-tieu-bieu  Chi đoàn tiêu biểu
├── Góc học sinh
│   ├── /cau-chuyen-dep              Câu chuyện đẹp
│   ├── /tro-choi                    Trò chơi (đố vui, quiz tích điểm)
│   │   └── /tro-choi/choi/[id]      Chơi một trò chơi
│   └── /dinh-huong-nghe-nghiep      Định hướng nghề nghiệp
├── /tai-lieu-sinh-hoat              Tài liệu sinh hoạt Chi đoàn (bài kèm tệp tải về, do Admin đăng)
├── /tinh-nguyen                     Lịch tình nguyện: các lớp tự đăng ký (quét sân…), bí thư có nút đăng ký cho Chi đoàn
├── /gop-y                           Gửi góp ý (ẩn danh được)
├── /tim-kiem                        Tìm kiếm toàn site
└── Chatbot "Trợ lý Đoàn trường AI"  (nút nổi ở mọi trang công khai)
```

## B. Đăng nhập & tài khoản

```
/login                  Đăng nhập (mật khẩu hoặc vân tay/khuôn mặt)
├── /forgot-password    Quên mật khẩu
└── /change-password    Đổi mật khẩu bắt buộc (lần đăng nhập đầu)
```

## C. Khu quản trị (sau đăng nhập, theo vai trò)

```
/dashboard                        Tổng quan (khác nhau theo vai trò)           🔐 mọi vai trò
│
├── Tổ chức
│   ├── /members                  Đoàn viên & thanh niên (lọc, xếp theo tên, Xuất/Nhập Excel)   👑 🧑‍💼
│   │   ├── /members/new          Thêm đoàn viên                               👑
│   │   └── /members/[id]         Hồ sơ (tab Hồ sơ · Hoạt động và điểm)        👑 🧑‍💼
│   │       └── /members/[id]/edit  Sửa hồ sơ + hồ sơ chi tiết                 👑
│   └── /departments              Chi đoàn                                     👑
│       └── /departments/[id]     Chi tiết Chi đoàn (tab Đoàn viên · Hoạt động) 👑
│
├── Hoạt động
│   ├── /volunteer                Tình nguyện: bí thư gửi đăng ký cho cả Chi đoàn (Admin duyệt)     👑 🧑‍💼
│   │   └── /volunteer/new        Đăng ký tình nguyện (công việc, ngày giờ, giờ và điểm mỗi em)
│   ├── /activities               Hoạt động Đoàn                               🔐
│   │   ├── /activities/new       Tạo hoạt động                                👑 🧑‍💼
│   │   └── /activities/[id]      Chi tiết (mã QR, đăng ký)
│   │       ├── /activities/[id]/edit        Sửa hoạt động                     👑 🧑‍💼
│   │       └── /activities/[id]/attendance  Điểm danh                         👑 🧑‍💼
│   ├── /attendance               Điểm danh                                    👑 🧑‍💼
│   ├── /schedule                 Lịch công tác                                👑
│   ├── /checkin                  Quét QR điểm danh                            🧑‍💼 🎓
│   └── /history                  Lịch sử hoạt động của tôi                    🧑‍💼 🎓
│
├── Thi đua & trò chơi
│   ├── /emulation                Thi đua Chi đoàn                             🔐
│   ├── /achievements             Thành tích, huy hiệu                         🔐
│   ├── /games                    Trò chơi tích điểm (danh sách, chơi)         🔐
│   │   └── /games/[id]           Chơi / xem một trò chơi
│   └── /quizzes                  Quản lý trò chơi tích điểm                   👑
│       ├── /quizzes/new          Tạo trò chơi (có AI soạn câu hỏi)
│       └── /quizzes/[id]  ·  /quizzes/[id]/edit
│
├── Cộng đồng
│   ├── /feed                     Bảng tin                                     🔐
│   │   └── /feed/new             Đăng bài
│   ├── /polls                    Bình chọn                                    🔐
│   │   └── /polls/new            Tạo bình chọn                                👑
│   └── /feedback                 Góp ý từ cổng công khai                      👑
│       └── /feedback/[id]        Xử lý một góp ý
│
├── /approvals                    Hàng chờ duyệt (bài của bí thư, đăng ký tình nguyện, góp ý, báo cáo; AI soát bài)  👑
├── /reports                      Báo cáo (tab Tổng quan · Hoạt động · Chi đoàn · Đoàn viên; Xuất Excel)  👑
├── /chapter-reports              Báo cáo Chi đoàn                             👑 🧑‍💼
│   ├── /chapter-reports/new  ·  /chapter-reports/[id]  ·  /chapter-reports/[id]/edit
│
├── Cổng thông tin (quản lý nội dung)                                           👑 🧑‍💼 (bí thư: bài của mình)
│   ├── /cms/tin-tuc  ·  /cms/ke-hoach  ·  /cms/su-kien  ·  /cms/thong-bao
│   ├── /cms/cau-chuyen-dep  ·  /cms/dinh-huong-nghe-nghiep  ·  /cms/tai-lieu-sinh-hoat
│   │      └── /cms/[loại]/new  ·  /cms/[loại]/[id]  ·  /cms/[loại]/[id]/edit   (có Trợ lý AI soạn bài)
│   ├── /cms/pages  →  /cms/pages/[slug]   Trang giới thiệu                    👑
│   ├── /cms/marquee              Dòng chữ chạy                                👑
│   ├── /cms/menu                 Menu website (thanh menu trên + thanh bên trái)  👑
│   └── /cms/settings             Thông tin website (liên hệ, banner, đếm ngược) 👑
│
├── /profile                      Hồ sơ cá nhân & thẻ số (QR)                  🧑‍💼 🎓
├── /settings                     Cài đặt (Tài khoản, Thông báo, Mật khẩu, Vân tay, Năm học,   🔐 (một số mục 👑)
│                                 Ban chấp hành, Loại hoạt động, Danh mục kế hoạch,
│                                 Trần điểm trò chơi, Thông tin website, Chữ chạy,
│                                 Trang giới thiệu, Dữ liệu và dung lượng)
└── /audit                        Nhật ký hệ thống                             👑
```

---

## Ma trận truy cập theo vai trò

| Nhóm chức năng | Khách | Đoàn viên | Bí thư | Admin / BCH |
|---|:-:|:-:|:-:|:-:|
| Cổng công khai (tin, sự kiện, thi đua, trò chơi, chatbot, góp ý) | ✔ | ✔ | ✔ | ✔ |
| Hồ sơ cá nhân, thẻ QR, quét điểm danh, lịch sử, thành tích | – | ✔ | ✔ | – |
| Hoạt động, thi đua, trò chơi, bảng tin, bình chọn (xem/tham gia) | – | ✔ | ✔ | ✔ |
| Quản lý đoàn viên & hoạt động **trong Chi đoàn mình** | – | – | ✔ | ✔ (toàn trường) |
| Đăng bài/báo cáo Chi đoàn (chờ Admin duyệt) | – | – | ✔ | ✔ (đăng trực tiếp) |
| Chi đoàn, báo cáo toàn trường, hàng chờ duyệt, góp ý | – | – | – | ✔ |
| Tạo trò chơi, bình chọn, nội dung cổng, trang giới thiệu, chữ chạy | – | – | – | ✔ |
| Hồ sơ chi tiết (CCCD, địa chỉ…) | – | Xem của mình | – | Xem + sửa |
| Cài đặt hệ thống, nhật ký hệ thống, dữ liệu & dung lượng | – | – | – | ✔ |

## Menu công khai (thứ tự)
Trang chủ · Giới thiệu (Đoàn trường, BCH, Cơ cấu tổ chức, Cờ đỏ, Nội quy) · Kế hoạch · Tin tức · Thi đua (thả xuống: Bảng thi đua tháng, Thành tích, Chi đoàn tiêu biểu) · Định hướng · Sinh hoạt Chi đoàn · Thông báo · Trò chơi · Góp ý · Báo cáo Chi đoàn (Khối 10, 11, 12, Chi đoàn giáo viên) · Liên kết. Các trang Sự kiện, Lịch hoạt động, Lịch công tác, Câu chuyện đẹp vẫn tồn tại, mở từ trang chủ, thanh bên và chân trang.

## Ghi chú
- **Chi đoàn giáo viên** (cờ `isTeacher` khi tạo Chi đoàn): không có khối/khóa, không lên lớp cuối năm, không tính vào thống kê và thi đua của học sinh; có bộ lọc "Đối tượng" (Học sinh/Giáo viên) ở danh sách Chi đoàn và Đoàn viên.
- Đường dẫn dạng `[id]`, `[slug]`, `[loại]` là tham số động (mã bản ghi, đường dẫn bài, loại nội dung).
- Mọi trang quản trị yêu cầu đăng nhập; bí thư và đoàn viên không vào được trang của vai trò cao hơn (hệ thống trả về không tìm thấy hoặc chuyển về Tổng quan).
- Hệ thống cũng có các đường dẫn kỹ thuật không hiển thị với người dùng: `/api/...` (thông báo đẩy, xuất Excel, tải ảnh, danh mục đơn vị hành chính) và `manifest` (cài như ứng dụng).
