# Hiểu công nghệ bằng ví dụ đời thường

> Mỗi mục có 3 phần: **Là gì (ví dụ đời thường)**, **Trong hệ thống của mình**, **Câu nói gọn để trả lời giám khảo**.
> Không cần nhớ thuật ngữ tiếng Anh. Chỉ cần nói được ý.

## 1. Trang web, máy chủ, "đám mây"
- **Ví dụ:** Trang web giống **một cửa hàng**. **Máy chủ** là **tòa nhà** chứa cửa hàng đó, mở cửa 24/24. Người dùng dùng điện thoại hay máy tính như đi tới cửa hàng bằng bất kỳ phương tiện nào. "Đám mây" nghĩa là tòa nhà đó **thuê của một công ty** (không phải máy đặt ở trường).
- **Trong hệ thống:** Hệ thống chạy trên dịch vụ **Vercel** (đặt tại Singapore, gần Việt Nam nên nhanh). Trường không phải mua và bảo trì máy chủ.
- **Câu nói gọn:** "Hệ thống chạy trên đám mây nên mở bằng điện thoại hay máy tính, ở đâu có mạng cũng dùng được, trường không phải mua máy chủ."

## 2. Cơ sở dữ liệu
- **Ví dụ:** Là **cuốn sổ cái điện tử** có rất nhiều trang: trang đoàn viên, trang hoạt động, trang điểm danh... Mỗi trang là một **bảng**, mỗi dòng là một bản ghi. Tìm một người trong 1.400 người chỉ mất một phần giây.
- **Trong hệ thống:** Dùng **PostgreSQL**, loại sổ cái phổ biến và tin cậy. Có **33 bảng**, ví dụ: tài khoản, đoàn viên, Chi đoàn, hoạt động, điểm danh, điểm, huy hiệu, bài viết...
- **Câu nói gọn:** "Mọi dữ liệu được lưu trong cơ sở dữ liệu PostgreSQL, giống một cuốn sổ cái điện tử, tìm và tổng hợp rất nhanh."

## 3. Mã QR điểm danh (phần giám khảo hay hỏi nhất)
- **Ví dụ:** Giống **vé xem phim có mã số dùng một lần và chỉ sống 90 giây**. Chụp ảnh gửi bạn cũng vô ích vì mã sẽ hết hạn.
- **Trong hệ thống (từng bước):**
  1. Người quản lý bấm "Mở điểm danh" (chỉ mở được từ 60 phút trước giờ bắt đầu).
  2. Màn hình hiện mã QR, **tự đổi sau mỗi 90 giây**.
  3. Đoàn viên quét bằng điện thoại, hệ thống hiện tên hoạt động, đoàn viên **bấm xác nhận**.
  4. Máy chủ kiểm tra mã còn hạn, hoạt động đang mở, đoàn viên thuộc đúng Chi đoàn, chưa điểm danh.
  5. Máy chủ **tự cộng điểm** và giờ tình nguyện, xét huy hiệu, gửi thông báo.
- **Câu nói gọn:** "Mã QR chỉ sống 90 giây, mỗi người điểm danh một lần, và điểm do máy chủ tính chứ không phải điện thoại gửi lên, nên không thể tự thêm điểm hay điểm danh hộ qua ảnh chụp mã."

## 4. Điểm do máy chủ tính, không tin điện thoại
- **Ví dụ:** Giống **thu ngân tính tiền trên máy của cửa hàng**, khách không tự viết giá lên hóa đơn.
- **Trong hệ thống:** Điện thoại chỉ báo "tôi vừa quét mã", còn **số điểm được lấy từ cấu hình hoạt động** trong máy chủ.
- **Câu nói gọn:** "Điện thoại chỉ gửi yêu cầu điểm danh; số điểm do máy chủ quyết định nên không thể làm giả."

## 5. "Giao dịch" – làm trọn bộ hoặc không làm gì
- **Ví dụ:** Chuyển tiền ngân hàng: trừ ở tài khoản A và cộng vào B **phải xảy ra cùng lúc**, hoặc không xảy ra gì, không được mất tiền giữa chừng.
- **Trong hệ thống:** Khi điểm danh, việc **ghi điểm danh + cộng điểm + cộng giờ tình nguyện + xét huy hiệu** là một giao dịch. Nếu lỗi giữa chừng thì hủy hết, không để lệch số liệu.
- **Câu nói gọn:** "Các bước điểm danh được gói thành một giao dịch nên không bao giờ có chuyện được điểm danh mà quên cộng điểm."

## 6. Mật khẩu được "băm" (không lưu mật khẩu thật)
- **Ví dụ:** Giống **ép dấu vân tay thành một mẫu không thể ngược lại thành ngón tay**. Hệ thống chỉ lưu "mẫu" của mật khẩu. Khi bạn đăng nhập, nó băm mật khẩu bạn gõ rồi so mẫu. Ngay cả quản trị viên cũng **không xem được mật khẩu thật**.
- **Trong hệ thống:** Dùng thuật toán **bcrypt**. Vì vậy Admin chỉ có thể **cấp mật khẩu mới**, không "xem lại" mật khẩu cũ.
- **Câu nói gọn:** "Hệ thống không lưu mật khẩu thật, chỉ lưu bản băm không thể dịch ngược, nên dù lộ dữ liệu cũng khó lộ mật khẩu."

## 7. Phân quyền (ai được làm gì)
- **Ví dụ:** Giống **chìa khóa trong tòa nhà**: bảo vệ có chìa cổng, giám đốc có chìa mọi phòng, nhân viên chỉ có chìa phòng mình.
- **Trong hệ thống:** 3 vai trò (Quản trị, Bí thư, Đoàn viên). Bí thư chỉ thấy **Chi đoàn của mình**. Điều quan trọng: việc kiểm tra quyền làm **ở máy chủ**, không chỉ ẩn nút trên màn hình. Dù biết đường dẫn trang của lớp khác, bí thư cũng không vào được.
- **Câu nói gọn:** "Quyền được kiểm tra ở máy chủ nên không thể vượt quyền bằng cách gõ đường dẫn."

## 8. Bí thư là "đoàn viên có thêm quyền"
- **Ví dụ:** Một học sinh được bầu làm **lớp trưởng**: vẫn là học sinh, chỉ thêm trách nhiệm. Khi lớp bầu người khác, bạn đó lại là học sinh bình thường.
- **Trong hệ thống:** Bí thư dùng **chính tài khoản đoàn viên** của mình. Khi bầu bí thư mới, Admin chọn đoàn viên khác, bí thư cũ tự trở lại là đoàn viên.
- **Câu nói gọn:** "Bí thư không phải một tài khoản riêng, mà là đoàn viên được gán thêm vai trò, giống lớp trưởng vẫn là học sinh."

## 9. Tự chuyển năm học
- **Ví dụ:** Giống **học sinh lên lớp**: không cần đăng ký lại, chỉ đổi lớp.
- **Trong hệ thống:** Mỗi Chi đoàn lưu **năm vào lớp 10**. Từ 01/09, hệ thống **tự đổi tên** 10A1 thành 11A1, rồi 12A1. Khóa quá lớp 12 chuyển sang "đã ra trường", tài khoản bị khóa nhưng **dữ liệu vẫn giữ để tra cứu**.
- **Câu nói gọn:** "Điểm, huy hiệu và lịch sử đi cùng đoàn viên suốt 3 năm, không phải nhập lại mỗi năm học."

## 10. Thi đua công bằng
- **Công thức (nên thuộc):** **Tổng điểm = Điểm thi đua trường (Ban chấp hành ghi nhận) + Điểm hoạt động bình quân mỗi đoàn viên.**
- **Ví dụ:** So điểm trung bình môn của hai lớp, **không so tổng điểm** vì lớp đông sẽ luôn hơn.
- **Câu nói gọn:** "Chi đoàn đông hay ít người đều được so sánh công bằng vì dùng điểm bình quân mỗi người."

## 11. Ứng dụng cài lên điện thoại (PWA)
- **Ví dụ:** Giống **thêm lối tắt ra màn hình chính**: bấm vào là mở như ứng dụng, có biểu tượng, toàn màn hình, có thông báo.
- **Trong hệ thống:** Không cần đưa lên CH Play hay App Store (mất phí, mất thời gian duyệt). Người dùng mở trang web rồi chọn "Thêm vào màn hình chính".
- **Câu nói gọn:** "Hệ thống cài như ứng dụng ngay từ trình duyệt, không cần cửa hàng ứng dụng nên cập nhật là có ngay."

## 12. Thông báo đẩy
- **Ví dụ:** Giống **tin nhắn tự bật lên trên màn hình khóa** như tin Zalo.
- **Trong hệ thống:** Khi có hoạt động mới, nhắc lịch trước 24 giờ, được cộng điểm, đạt huy hiệu... điện thoại nhận thông báo kèm âm thanh (nếu bật).

## 13. Đăng nhập bằng vân tay / khuôn mặt (passkey)
- **Ví dụ:** Giống **mở khóa điện thoại bằng vân tay**: bạn quét vân tay, **hình vân tay ở lại trong điện thoại**, không gửi đi đâu.
- **Trong hệ thống:** Điện thoại chứng minh "đúng máy này, đúng chủ" bằng một chìa khóa mật mã. Máy chủ chỉ giữ **nửa công khai** của chìa khóa (không dùng để đăng nhập thay được). Chuẩn quốc tế **WebAuthn**.
- **Câu nói gọn:** "Dữ liệu vân tay hay khuôn mặt không rời khỏi điện thoại; hệ thống không lưu và không thấy chúng."

## 14. HTTPS và mã hóa
- **Ví dụ:** Giống **gửi thư trong phong bì dán kín** thay vì thẻ bưu thiếp ai cũng đọc được.
- **Trong hệ thống:** Trang web dùng HTTPS (ổ khóa trên trình duyệt), dữ liệu đi lại giữa điện thoại và máy chủ được mã hóa.

## 15. Nhật ký thao tác
- **Ví dụ:** Giống **camera an ninh**: ai làm gì, lúc nào đều được ghi lại.
- **Trong hệ thống:** Đăng nhập, tạo/sửa/xóa, điều chỉnh điểm, duyệt bài, bầu bí thư... đều ghi nhật ký (giữ 120 ngày). Nhờ vậy truy ra được ai đã sửa gì.

## 16. Dọn dữ liệu tự động
- **Ví dụ:** Giống **dọn tủ**: bỏ giấy báo cũ, giữ giấy tờ quan trọng.
- **Trong hệ thống:** Thông báo cũ (đã đọc quá 90 ngày, chưa đọc quá 120 ngày) và nhật ký quá 120 ngày tự bị xóa; **điểm danh, điểm, huy hiệu, báo cáo giữ vĩnh viễn**.

## 17. Tác vụ tự chạy hằng ngày
- **Ví dụ:** Giống **báo thức**: mỗi sáng tự làm vài việc.
- **Trong hệ thống:** Mỗi ngày tự chạy 3 việc: nhắc lịch hoạt động, chuyển năm học khi cần, dọn dữ liệu cũ.

## 18. Lưu ảnh và tệp
- **Ví dụ:** Giống **gửi ảnh nặng vào kho riêng** thay vì để trong sổ cái cho nặng.
- **Trong hệ thống:** Ảnh và tệp PDF/Word/Excel lưu ở dịch vụ **Cloudinary**; cơ sở dữ liệu chỉ giữ đường dẫn, nên rất nhẹ.

## 19. Sao lưu và độ tin cậy
- **Trong hệ thống:** Cơ sở dữ liệu là dịch vụ đám mây có sao lưu của nhà cung cấp. **Hãy nói trung thực:** hiện hệ thống chưa có chức năng "xuất toàn bộ dữ liệu" tự động; đây là hướng phát triển.

## 20. Mã nguồn mở và công nghệ đã dùng (nếu giám khảo hỏi "dùng gì")
Chỉ cần nói tên và vai trò:
| Phần | Tên | Vai trò (một câu) |
|---|---|---|
| Khung xây dựng trang | Next.js, React | Dựng giao diện và xử lý phía máy chủ |
| Ngôn ngữ | TypeScript | Viết mã chặt chẽ, ít lỗi |
| Giao diện | Tailwind CSS | Tạo màu sắc, bố cục, tương thích điện thoại |
| Sổ cái dữ liệu | PostgreSQL + Prisma | Lưu và truy vấn dữ liệu |
| Triển khai | Vercel | Đưa hệ thống lên mạng |
| Lưu ảnh | Cloudinary | Kho ảnh, tệp |
| Thông báo đẩy | Web Push | Gửi thông báo tới điện thoại |
| Đăng nhập vân tay | WebAuthn | Chuẩn quốc tế dùng cho passkey |
