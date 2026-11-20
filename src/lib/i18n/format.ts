import type { Locale } from "./config";

/** Mã locale cho Intl / toLocaleDateString: dùng thay cho "vi-VN" cứng. */
export const intlLocale = (locale: Locale) => (locale === "en" ? "en-GB" : "vi-VN");
