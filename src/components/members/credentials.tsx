"use client";
import type { Credential } from "@/actions/members";

export function downloadCsv(rows: Credential[], filename: string) {
  const esc = (v: string) => `"${v.replaceAll('"', '""')}"`;
  const lines = [["Mã đoàn viên", "Họ tên", "Chi đoàn", "Mật khẩu tạm thời"].map(esc).join(",")]
    .concat(rows.map((r) => [r.code, r.fullName, r.department, r.password].map(esc).join(",")));
  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export type AccountRow = { username: string; fullName: string; detail?: string; password: string };

/** Tải về tệp CSV danh sách tài khoản vừa tạo/cấp lại (mật khẩu tạm chỉ hiện một lần nên tự lưu lại cho Admin). */
export function downloadAccounts(rows: AccountRow[], filename: string, detailHeader = "Ghi chú") {
  const esc = (v: string) => `"${v.replaceAll('"', '""')}"`;
  const lines = [["Tên đăng nhập", "Họ tên", detailHeader, "Mật khẩu tạm thời"].map(esc).join(",")]
    .concat(rows.map((r) => [r.username, r.fullName, r.detail ?? "", r.password].map(esc).join(",")));
  const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export const csvStamp = () => new Date().toISOString().slice(0, 10);
