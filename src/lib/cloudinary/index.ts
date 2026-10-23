import "server-only";
import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";

export type UploadFolder = "activities" | "members" | "certificates" | "documents" | "chat";
const ROOT = "doan-sonha";

export const isCloudinaryConfigured = () =>
  !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

function configure() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export const folderPath = (f: UploadFolder) => `${ROOT}/${f}`;

/** publicId do client gửi lên chỉ hợp lệ nếu nằm trong thư mục của hệ thống. */
export const isOwnPublicId = (publicId: string, f: UploadFolder) => publicId.startsWith(`${folderPath(f)}/`);

export function uploadImage(buffer: Buffer, folder: UploadFolder): Promise<UploadApiResponse> {
  configure();
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: folderPath(folder),
          resource_type: "image",
          // 2000px là mức cân bằng cho gói Cloudinary miễn phí (25 credit/tháng, băng thông là thứ tốn nhất): đủ nét cho ảnh bìa toàn trang, không quá nặng.
          transformation: [{ width: 2000, height: 2000, crop: "limit", quality: "auto:good" }],
        },
        (err, res) => (err || !res ? reject(err ?? new Error("Upload thất bại")) : resolve(res)),
      )
      .end(buffer);
  });
}

/** Tải tệp tài liệu lên. PDF tải dạng "image" để Cloudinary dựng được ảnh trang đầu; Office tải dạng "raw". Tên gốc được giữ trong public_id để tải về đúng tên. */
export function uploadDocument(buffer: Buffer, filename: string): Promise<UploadApiResponse> {
  configure();
  const safe = filename.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").replace(/[^a-zA-Z0-9._-]+/g, "_").slice(-80);
  const isPdf = /\.pdf$/i.test(safe);
  const publicId = `${Math.random().toString(36).slice(2, 8)}-${isPdf ? safe.replace(/\.pdf$/i, "") : safe}`; // ảnh/PDF: public_id không kèm đuôi
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ folder: folderPath("documents"), resource_type: isPdf ? "image" : "raw", public_id: publicId, use_filename: false },
        (err, res) => (err || !res ? reject(err ?? new Error("Upload thất bại")) : resolve(res)))
      .end(buffer);
  });
}

/** Chữ ký để trình duyệt tải thẳng tệp lớn (video, tệp) lên Cloudinary, không đi qua máy chủ (Vercel giới hạn thân yêu cầu ~4,5MB). */
export function signUpload(folder: UploadFolder, extra: Record<string, string | number> = {}) {
  configure();
  const timestamp = Math.floor(Date.now() / 1000);
  const params = { folder: folderPath(folder), timestamp, ...extra };
  const signature = cloudinary.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET!);
  return { signature, timestamp, folder: params.folder, apiKey: process.env.CLOUDINARY_API_KEY!, cloudName: process.env.CLOUDINARY_CLOUD_NAME! };
}

export type CloudinaryUsage = {
  plan: string;
  /** Credit đã dùng trong chu kỳ hiện tại so với hạn mức (gói miễn phí: 25 credit/tháng, dùng chung cho lưu trữ, băng thông và biến đổi ảnh). */
  credits: { used: number; limit: number; percent: number } | null;
  storageBytes: number;
  bandwidthBytes: number;
  transformations: number;
  objects: number;
  lastUpdated: string | null;
};

/** Mức dùng Cloudinary của tài khoản (Admin API). Lỗi hoặc chưa cấu hình thì trả `{ error }` với lý do để hiển thị. Cloudinary tự cập nhật số liệu theo chu kỳ nên có thể chậm vài giờ. */
export async function cloudinaryUsage(): Promise<CloudinaryUsage | { error: string }> {
  if (!isCloudinaryConfigured()) return { error: "Chưa cấu hình khóa Cloudinary trên máy chủ." };
  configure();
  try {
    const u = (await cloudinary.api.usage()) as Record<string, unknown>;
    const part = (k: string) => (u[k] && typeof u[k] === "object" ? (u[k] as Record<string, unknown>) : {});
    const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : Number(v) || 0);
    const c = part("credits");
    const limit = num(c.limit);
    return {
      plan: typeof u.plan === "string" ? u.plan : "",
      credits: limit > 0 ? { used: num(c.usage), limit, percent: num(c.used_percent) || (num(c.usage) / limit) * 100 } : null,
      storageBytes: num(part("storage").usage),
      bandwidthBytes: num(part("bandwidth").usage),
      transformations: num(part("transformations").usage),
      objects: num(part("objects").usage) || num(u.resources),
      lastUpdated: typeof u.last_updated === "string" ? u.last_updated : null,
    };
  } catch (e) {
    // Lỗi của SDK có dạng { error: { message, http_code } }; chỉ ghi cảnh báo (không dùng console.error để khỏi bật hộp lỗi đỏ ở chế độ dev)
    const msg = (e as { error?: { message?: string }; message?: string })?.error?.message ?? (e as Error)?.message ?? "Không rõ lý do";
    console.warn("[cloudinary] usage failed:", msg);
    return { error: /api_secret mismatch|invalid api_key|unknown api_key|401/i.test(msg) ? "Khóa Cloudinary không đúng (API Key và API Secret không khớp nhau). Kiểm tra lại biến CLOUDINARY_API_KEY và CLOUDINARY_API_SECRET." : `Cloudinary báo lỗi: ${msg}` };
  }
}

export async function deleteImage(publicId: string | null | undefined) {
  if (!publicId || !isCloudinaryConfigured()) return;
  configure();
  try {
    // Tài liệu nằm ở thư mục documents: PDF là "image", Office là "raw" -> thử cả hai.
    if (publicId.startsWith(`${folderPath("documents")}/`)) {
      const r = await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
      if (r.result !== "ok") await cloudinary.uploader.destroy(publicId, { resource_type: "raw" });
    } else {
      await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
    }
  } catch (e) {
    console.error("[cloudinary] delete failed", e);
  }
}
