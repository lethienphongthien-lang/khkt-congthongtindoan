/** Chủ đề trò chơi: tên, biểu tượng, màu (dùng chung cho danh sách, trang chơi và trang quản lý). */
export const THEMES = {
  quiz: { label: "Đố vui", emoji: "🧠", grad: "from-sky-500 to-blue-600", soft: "bg-sky-50 text-sky-700" },
  truefalse: { label: "Đúng hay sai", emoji: "✅", grad: "from-emerald-500 to-green-600", soft: "bg-emerald-50 text-emerald-700" },
  picture: { label: "Đuổi hình bắt chữ", emoji: "🖼️", grad: "from-amber-400 to-orange-500", soft: "bg-amber-50 text-amber-700" },
  order: { label: "Sắp xếp thứ tự", emoji: "🔢", grad: "from-violet-500 to-purple-600", soft: "bg-violet-50 text-violet-700" },
  mix: { label: "Thử thách tổng hợp", emoji: "🏆", grad: "from-rose-500 to-pink-600", soft: "bg-rose-50 text-rose-700" },
} as const;
export type ThemeKey = keyof typeof THEMES;
export const themeOf = (k: string) => THEMES[(k in THEMES ? k : "quiz") as ThemeKey];
