import { z } from "zod";

/** Quy tắc kiểm tra dữ liệu nhập dùng chung cho máy chủ (zod) và trình duyệt (thuộc tính ô nhập). */

/** Số điện thoại Việt Nam: bắt đầu bằng 0, đủ 10 chữ số, chỉ gồm chữ số. */
export const PHONE_RE = /^0\d{9}$/;
export const PHONE_MSG = "Số điện thoại gồm 10 chữ số, bắt đầu bằng số 0 (ví dụ 0912345678)";
/** CMND (9 số) hoặc CCCD (12 số). */
export const ID_RE = /^(\d{9}|\d{12})$/;
export const ID_MSG = "Số CMND/CCCD gồm 9 hoặc 12 chữ số";
/** Họ tên: chỉ gồm chữ cái (có dấu), khoảng trắng, dấu nháy ', dấu chấm và gạch nối; không có chữ số hay ký tự lạ. */
export const NAME_RE = /^[\p{L}][\p{L}\s'.-]*$/u;
export const NAME_MSG = "Họ tên chỉ gồm chữ cái, không chứa chữ số hoặc ký tự đặc biệt";

export const MIN_BIRTH = "1940-01-01";
export const MIN_ID_ISSUE = "1970-01-01";

/** Hôm nay theo giờ Việt Nam, dạng YYYY-MM-DD (dùng cho thuộc tính max của ô ngày). */
export const todayVN = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);

/** Bỏ khoảng trắng thừa ở đầu, cuối và giữa họ tên. */
export const cleanName = (s: string) => s.replace(/\s+/g, " ").trim();
/** Chỉ giữ chữ số (dùng khi nhập số điện thoại, CCCD để không gõ được chữ). */
export const digitsOnly = (s: string, max?: number) => { const d = s.replace(/\D/g, ""); return max ? d.slice(0, max) : d; };
/** Bỏ chữ số và ký tự lạ khỏi họ tên khi gõ (giữ chữ có dấu, khoảng trắng, ' . -). */
export const nameOnly = (s: string) => s.replace(/[^\p{L}\s'.-]/gu, "");

export const personName = (label = "họ tên") =>
  z.string().trim().min(2, `Vui lòng nhập ${label}`).max(100, `${label[0].toUpperCase()}${label.slice(1)} tối đa 100 ký tự`)
    .transform(cleanName).refine((v) => NAME_RE.test(v), NAME_MSG);

const emptyToUndef = (v: unknown) => (v === "" || v === null ? undefined : v);

/**
 * Ngày không được ở tương lai và không quá xa về trước. Chấp nhận chuỗi YYYY-MM-DD hoặc Date; để trống là bỏ qua.
 * Hết ngày hôm nay (giờ Việt Nam) vẫn hợp lệ.
 */
export const pastDate = (opts: { min: string; msgFuture: string; msgPast: string; msgInvalid?: string }) =>
  z.preprocess(emptyToUndef, z.coerce.date({ message: opts.msgInvalid ?? "Ngày không hợp lệ" })
    .refine((d) => d.getTime() <= Date.now() + 24 * 3600_000 && d.toISOString().slice(0, 10) <= todayVN(), opts.msgFuture)
    .refine((d) => d.toISOString().slice(0, 10) >= opts.min, opts.msgPast)
    .optional());

export const phoneField = z.preprocess(emptyToUndef, z.string().trim().regex(PHONE_RE, PHONE_MSG).optional());
export const emailField = z.preprocess(emptyToUndef, z.string().trim().toLowerCase().max(120, "Email tối đa 120 ký tự").email("Email không hợp lệ (ví dụ ten@gmail.com)").optional());
