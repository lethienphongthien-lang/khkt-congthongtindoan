# BCH: tài khoản riêng và liên kết giáo viên

Tài khoản & Nhân sự → Nhân sự & BCH (quản trị tối cao) có hai lựa chọn:

- **Tạo tài khoản BCH riêng**: cho học sinh làm BCH hoặc người chưa có tài khoản giáo viên. Không tự tạo hồ sơ EduConnect. Học sinh giữ tài khoản học sinh riêng; cấp lại mật khẩu/khóa BCH không ảnh hưởng tài khoản học sinh.
- **Liên kết tài khoản giáo viên**: chỉ chọn giáo viên EduConnect đang hoạt động. Dùng chung mật khẩu; quyền EduConnect không tăng theo quyền Đoàn. Thu hồi BCH không khóa giáo viên.

Cổng Đoàn chạy được với database chỉ có public, không có EduConnect. Liên kết giáo viên tự ẩn khi không có schema; EDUCONNECT_INTEGRATION=off tắt tìm/liên kết giáo viên. Các chức năng tạo BCH riêng, sửa, khóa/mở, mật khẩu và bí thư/cờ đỏ/lớp trưởng không cần ứng dụng EduConnect.

Sau khi tạo cấu trúc, cài trigger bằng node scripts/install-officers.mjs; npm run db:push và vercel-build tự thực hiện. Không chạy reset production. Bảng Department có presidentId để lưu lớp trưởng độc lập. Khi có EduConnect dùng chung DB, trigger bên edu đồng bộ sang SchoolClass.monitorStudentId.

Kiểm thử trên database dùng tạm ở localhost (không chạy các test này trên production):

```sh
RUN_STANDALONE_TESTS=1 node --conditions=react-server --import tsx --test tests/standalone-accounts.integration.test.ts
RUN_SHARED_TEACHER_TESTS=1 node --conditions=react-server --import tsx --test tests/shared-teacher.integration.test.ts
```

Test đầu cần database public-only đã db:push/cài trigger, test sau cần database cục bộ đầy đủ schema edu/public. Cả hai đều kiểm tra hostname local trước khi ghi fixture. Cần đặt DATABASE_URL/DIRECT_URL trỏ đúng DB dùng tạm và bỏ DATABASE_POOLED_URL production khỏi môi trường kiểm thử.

Giao diện BCH dùng DataTable, trạng thái và nút biểu tượng giống các màn hình cài đặt khác. Bấm Thêm BCH/Sửa để mở hộp thoại; không hiển thị biểu mẫu thường trực. Trang Năm học và lịch tuần chỉ hiển thị năm đã cấu hình; lịch mặc định tự tính dành cho bộ lọc không được coi là năm đã tạo. Đặt lại mặc định cập nhật bản ghi hiện có để đồng bộ qua EduConnect và giữ liên kết.

Sidebar có Tài khoản & Nhân sự (ba tab Tài khoản/Nhân sự & BCH/Bảo mật) và Cấu hình & Cài đặt (năm tab Năm học/Danh mục/Quy chế/Giao diện/Hệ thống). Không còn cột cài đặt bên trái. Cấp lại mật khẩu theo lớp đã chuyển sang tab Bảo mật. Các liên kết settings?tab=leaders/classpw/plancats/gamecap cũ được chuyển tới nơi mới. Tài khoản cá nhân, mật khẩu, passkey và thông báo nằm tại /settings/profile; quyền truy cập chức năng giữ nguyên.

Mục Giao diện giữ một hàng tab cấu hình chính. Các trang Thông tin website, Menu, Dòng chữ chạy và Trang giới thiệu được chọn qua ô Mục giao diện, không dựng thêm hàng tab thứ hai. URL cũ không đổi.
