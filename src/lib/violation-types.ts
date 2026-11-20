import type { MessageKey } from "@/lib/i18n/translate";

/** Loại vi phạm lưu trong DB (tiếng Việt); nhãn hiển thị dịch theo ngôn ngữ. */
export const VIOLATION_TYPES = ["Đồng phục", "Tác phong", "Vệ sinh", "Giờ giấc", "Nề nếp sinh hoạt", "Khác"];
const KEYS: Record<string, MessageKey> = { "Đồng phục": "vio.type.uniform", "Tác phong": "vio.type.manner", "Vệ sinh": "vio.type.hygiene", "Giờ giấc": "vio.type.time", "Nề nếp sinh hoạt": "vio.type.routine", "Khác": "vio.type.other" };
export const violationTypeLabel = (t: (k: MessageKey) => string, v: string) => (KEYS[v] ? t(KEYS[v]) : v);
