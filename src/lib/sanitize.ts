import "server-only";

import sanitizeHtml from "sanitize-html";
import { isHtml, plainText } from "./rich-html";
import { UserError } from "./action";

const ALIGN = [/^(left|right|center|justify)$/];
/** Chỉ giữ các thẻ/thuộc tính mà trình soạn thảo tạo ra; loại bỏ script, sự kiện, đường dẫn nguy hiểm. */
export function cleanHtml(html: string): string {
  if (!isHtml(html)) return html; // nội dung cũ (văn bản) giữ nguyên
  return sanitizeHtml(html, {
    allowedTags: ["p", "br", "h2", "h3", "h4", "strong", "b", "em", "i", "u", "s", "mark", "span", "blockquote", "ul", "ol", "li", "hr", "a", "img", "table", "thead", "tbody", "tr", "th", "td", "colgroup", "col"],
    allowedAttributes: { a: ["href", "target", "rel"], img: ["src", "alt", "width", "height"], "*": ["style"], th: ["colspan", "rowspan", "colwidth"], td: ["colspan", "rowspan", "colwidth"] },
    allowedStyles: { col: { width: [/^\d+(\.\d+)?px$/], "min-width": [/^\d+(\.\d+)?px$/] }, table: { width: [/^\d+(\.\d+)?(px|%)$/], "min-width": [/^\d+(\.\d+)?px$/] }, "*": { "text-align": ALIGN, color: [/^#[0-9a-f]{3,8}$/i, /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/i], "background-color": [/^#[0-9a-f]{3,8}$/i, /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/i], "font-size": [/^\d{1,2}(\.\d+)?(px|pt|em|rem)$/] } },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesByTag: { img: ["https", "http"] },
    exclusiveFilter: (f) => f.tag === "img" && !String(f.attribs.src ?? "").startsWith("https://res.cloudinary.com/"), // chỉ nhận ảnh đã tải lên hệ thống
    transformTags: { a: (tag, attribs) => ({ tagName: "a", attribs: { ...attribs, target: "_blank", rel: "noopener noreferrer nofollow" } }) },
  });
}

/** Làm sạch nội dung do người dùng soạn và từ chối nội dung rỗng (trình soạn thảo trả về "<p></p>" khi trống). */
export function cleanContent(html: string): string {
  const out = cleanHtml(html).trim();
  if (!plainText(out, 5) && !/<img\s/i.test(out)) throw new UserError("Nhập nội dung");
  return out;
}
