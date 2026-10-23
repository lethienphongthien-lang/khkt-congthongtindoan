/** Trích token từ nội dung QR (URL đầy đủ hoặc token trần). Dùng được ở client. */
export function extractToken(raw: string): string | null {
  const text = raw.trim();
  try {
    return new URL(text).searchParams.get("t");
  } catch {
    return /^[\w-]+\.[\w-]+\.[\w-]+$/.test(text) ? text : null;
  }
}
