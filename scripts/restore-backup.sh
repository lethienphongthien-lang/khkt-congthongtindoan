#!/usr/bin/env bash
# Khôi phục bản sao lưu cơ sở dữ liệu (tệp .dump.gpg tải từ GitHub Actions).
#
# Cách dùng:
#   ./scripts/restore-backup.sh <tệp.dump.gpg> <địa-chỉ-kết-nối-cơ-sở-dữ-liệu-đích>
#
# CẢNH BÁO: lệnh này XÓA các bảng hiện có ở cơ sở dữ liệu đích rồi nạp lại từ bản sao lưu.
# Nên thử trước vào một cơ sở dữ liệu TRỐNG (tạo cơ sở dữ liệu mới) để kiểm tra bản sao lưu dùng được.
set -euo pipefail
FILE="${1:-}"; TARGET="${2:-}"
[ -f "$FILE" ] && [ -n "$TARGET" ] || { echo "Cách dùng: $0 <tệp.dump.gpg> <địa-chỉ-kết-nối-đích>"; exit 1; }
command -v gpg >/dev/null && command -v pg_restore >/dev/null || { echo "Cần cài gpg và postgresql-client (pg_restore)."; exit 1; }

echo "Sắp khôi phục '$FILE' vào cơ sở dữ liệu đích (host: $(echo "$TARGET" | sed -E 's#.*@([^/:?]+).*#\1#'))."
echo "Các bảng hiện có ở đó sẽ bị XÓA và thay bằng dữ liệu trong bản sao lưu."
read -r -p "Gõ CHAC CHAN để tiếp tục: " ok
[ "$ok" = "CHAC CHAN" ] || { echo "Đã hủy."; exit 1; }

TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
read -r -s -p "Mật khẩu giải mã (BACKUP_PASSPHRASE): " PASS; echo
printf '%s' "$PASS" | gpg --batch --yes --pinentry-mode loopback --passphrase-fd 0 -d -o "$TMP/db.dump" "$FILE"
pg_restore --clean --if-exists --no-owner --no-privileges --dbname="$TARGET" "$TMP/db.dump"
echo "Xong. Hãy kiểm tra số lượng bản ghi (ví dụ đếm đoàn viên) để chắc chắn dữ liệu đầy đủ."
