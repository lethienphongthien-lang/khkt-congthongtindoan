import type { Locale } from "./config";
import { vi, en } from "./messages";

export type MessageKey = keyof typeof vi;
export type Messages = Record<MessageKey, string>;
export const MESSAGES: Record<Locale, Messages> = { vi, en };

export type TFn = (key: MessageKey, params?: Record<string, string | number>) => string;

/** Tạo hàm dịch: thiếu khóa ở ngôn ngữ đích thì dùng tiếng Việt; "{name}" được thay bằng tham số. */
export function makeT(locale: Locale): TFn {
  const dict = MESSAGES[locale];
  return (key, params) => {
    const raw = dict[key] ?? vi[key] ?? key;
    return params ? raw.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`)) : raw;
  };
}

/** Nhãn menu do Admin có thể đã đổi tên: chỉ dịch khi vẫn là nhãn mặc định (tiếng Việt). */
export function menuLabel(t: TFn, id: string, label: string): string {
  const key = `menu.${id}` as MessageKey;
  return key in vi && vi[key] === label ? t(key) : label;
}
