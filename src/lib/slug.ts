/** Chuyển tiêu đề tiếng Việt thành slug ASCII: "Tin mới 2026" -> "tin-moi-2026". */
export function slugify(input: string) {
  return input
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d").replace(/Đ/g, "D")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
    .slice(0, 80) || "bai-viet";
}

export const uniqueSlug = (title: string) => `${slugify(title)}-${Math.random().toString(36).slice(2, 7)}`;
