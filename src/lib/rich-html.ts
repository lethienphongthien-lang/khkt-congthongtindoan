/** Tiện ích cho nội dung soạn bằng trình soạn thảo (HTML). Dùng được ở cả server lẫn client. */

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const inlineMd = (s: string) => esc(s).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

/** Nội dung mới lưu dạng HTML (bắt đầu bằng thẻ); nội dung cũ là văn bản kiểu Markdown nhẹ. */
export const isHtml = (s: string) => /^\s*<(p|h[1-6]|ul|ol|div|table|blockquote|img|hr)[\s>/]/i.test(s);

/** Chuyển văn bản kiểu cũ (## tiêu đề, - gạch đầu dòng, **đậm**) sang HTML để mở trong trình soạn thảo. */
export function legacyToHtml(text: string): string {
  if (!text.trim()) return "";
  if (isHtml(text)) return text;
  const out: string[] = [];
  let list: "ul" | "ol" | null = null; let para: string[] = [];
  const flushP = () => { if (para.length) { out.push(`<p>${inlineMd(para.join(" "))}</p>`); para = []; } };
  const flushL = () => { if (list) { out.push(`</${list}>`); list = null; } };
  for (const raw of text.replace(/\r/g, "").split("\n")) {
    const line = raw.trim(); let m: RegExpMatchArray | null;
    if (!line) { flushP(); flushL(); continue; }
    if ((m = line.match(/^###\s+(.*)/))) { flushP(); flushL(); out.push(`<h3>${inlineMd(m[1])}</h3>`); }
    else if ((m = line.match(/^##\s+(.*)/))) { flushP(); flushL(); out.push(`<h2>${inlineMd(m[1])}</h2>`); }
    else if ((m = line.match(/^[-*•]\s+(.*)/))) { flushP(); if (list !== "ul") { flushL(); list = "ul"; out.push("<ul>"); } out.push(`<li>${inlineMd(m[1])}</li>`); }
    else if ((m = line.match(/^\d+[.)]\s+(.*)/))) { flushP(); if (list !== "ol") { flushL(); list = "ol"; out.push("<ol>"); } out.push(`<li>${inlineMd(m[1])}</li>`); }
    else { flushL(); para.push(line); }
  }
  flushP(); flushL();
  return out.join("");
}

/** Văn bản thuần (để làm đoạn trích, thông báo, tìm kiếm). */
export function plainText(content: string, max = 200): string {
  const t = isHtml(content)
    ? content.replace(/<\/(p|h[1-6]|li|tr|div)>/gi, " ").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    : content.replace(/[#*]/g, "");
  return t.replace(/\s+/g, " ").trim().slice(0, max);
}

/** Chỗ cần điền AI để lại, dạng "[ghi rõ ngày bắt đầu]" (AI không được tự bịa số liệu, ngày giờ, tên). */
export const PLACEHOLDER_RE = /\[[^\[\]\n]{2,150}\]/g;
export const countPlaceholders = (s: string) => (plainText(s, 100000).match(PLACEHOLDER_RE) ?? []).length;
