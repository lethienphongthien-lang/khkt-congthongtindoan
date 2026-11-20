/** Khai báo từ điển một khu vực: vi là bản gốc, en bắt buộc có đúng các khóa của vi (sai/thiếu → lỗi `npm run lint`). */
export function defineMessages<const V extends Record<string, string>>(vi: V, en: Record<keyof V, string>) {
  return { vi, en } as { vi: V; en: Record<keyof V, string> };
}
