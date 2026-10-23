# Sao lưu cơ sở dữ liệu tự động

Mỗi ngày lúc **04:00 sáng (giờ Việt Nam)**, GitHub Actions xuất toàn bộ cơ sở dữ liệu, **mã hóa** rồi lưu thành tệp tải về được. Hệ thống chỉ giữ **7 bản mới nhất**.

## Thiết lập một lần
1. **Chuyển kho mã nguồn sang riêng tư** (bắt buộc): GitHub → kho `doan-thanh-nien` → Settings → General → Danger Zone → *Change repository visibility* → *Make private*. Quy trình sao lưu tự từ chối chạy nếu kho còn công khai.
2. Vào Settings → *Secrets and variables* → *Actions* → *New repository secret*, tạo hai secret:
   - `BACKUP_DATABASE_URL`: địa chỉ kết nối **trực tiếp** tới cơ sở dữ liệu (giá trị của `DIRECT_URL`, nếu không có thì `DATABASE_URL`).
   - `BACKUP_PASSPHRASE`: mật khẩu mã hóa, **ít nhất 16 ký tự**, ngẫu nhiên. **Tự lưu giữ ở nơi an toàn** (trình quản lý mật khẩu). Mất mật khẩu thì không mở được bản sao lưu.
3. Chạy thử: tab **Actions** → *Sao lưu cơ sở dữ liệu* → **Run workflow**. Khi xong (vài phút) tải tệp ở mục *Artifacts* cuối trang chạy.

## Khôi phục
```
./scripts/restore-backup.sh db-backup-YYYY-MM-DD_HHMM.dump.gpg "<địa-chỉ-kết-nối-cơ-sở-dữ-liệu-đích>"
```
Cần cài `gpg` và `postgresql-client`. Lệnh xóa bảng hiện có ở đích rồi nạp lại từ bản sao lưu, nên **thử trước vào một cơ sở dữ liệu trống** để chắc bản sao lưu dùng được.

## Lưu ý
- Giờ chạy của GitHub có thể trễ vài phút đến khoảng một giờ.
- Bản sao lưu chứa dữ liệu cá nhân học sinh: không chia sẻ tệp hay mật khẩu giải mã.
- Nếu hai lần chạy liên tiếp báo lỗi, GitHub sẽ gửi email cho chủ kho.
