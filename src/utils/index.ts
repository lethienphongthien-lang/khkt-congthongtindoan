import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

const TZ = "Asia/Ho_Chi_Minh";

export function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: TZ }).format(new Date(d));
}
export function formatTime(d: Date | string) {
  return new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TZ }).format(new Date(d));
}
export function formatDateTime(d: Date | string) {
  return `${formatTime(d)} - ${formatDate(d)}`;
}
export function formatDateShort(d: Date | string) {
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", timeZone: TZ }).format(new Date(d));
}
export const formatNumber = (n: number) => new Intl.NumberFormat("vi-VN").format(n);

export function formatHours(minutes: number) {
  const h = minutes / 60;
  return Number.isInteger(h) ? String(h) : h.toFixed(1);
}

export function relativeTime(d: Date | string) {
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  if (diff < 60) return "Vừa xong";
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} ngày trước`;
  return formatDate(d);
}

/** Giá trị cho <input type="datetime-local"> theo giờ Việt Nam. */
export function toLocalInput(d: Date | string) {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(new Date(d));
  return parts.replace(" ", "T");
}
/** Chuyển giá trị datetime-local (giờ VN, UTC+7) thành Date. */
export function fromLocalInput(v: string) {
  return new Date(`${v}:00+07:00`);
}
export function toDateInput(d: Date | string | null | undefined) {
  return d ? toLocalInput(d).slice(0, 10) : "";
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0]?.slice(0, 2) ?? "?").toUpperCase();
}

export function pageParam(v: string | string[] | undefined, fallback = 1) {
  const n = Number(Array.isArray(v) ? v[0] : v);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}
export const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;

/** Khoảng thời gian (giờ VN) của tham số lọc `YYYY-MM` (một tháng) hoặc `YYYY` (cả năm). */
export function monthParamRange(v?: string): { from: Date; to: Date } | null {
  const VN = 7 * 3600_000;
  const m = v?.match(/^(\d{4})-(\d{2})$/);
  if (m && +m[2] >= 1 && +m[2] <= 12) return { from: new Date(Date.UTC(+m[1], +m[2] - 1, 1) - VN), to: new Date(Date.UTC(+m[1], +m[2], 1) - VN) };
  const y = v?.match(/^(\d{4})$/);
  if (y) return { from: new Date(Date.UTC(+y[1], 0, 1) - VN), to: new Date(Date.UTC(+y[1] + 1, 0, 1) - VN) };
  return null;
}
