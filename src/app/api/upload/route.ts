import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { isCloudinaryConfigured, uploadDocument, uploadImage, type UploadFolder } from "@/lib/cloudinary";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);
const FOLDERS: UploadFolder[] = ["activities", "members", "certificates", "documents"];
const DOC_EXT = new Set(["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx"]);
const MAX_DOC_BYTES = 10 * 1024 * 1024; // giới hạn tệp raw của Cloudinary gói miễn phí

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.mustChangePassword) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  const folder = form.get("folder") as UploadFolder;
  if (!(file instanceof File) || !FOLDERS.includes(folder)) {
    return NextResponse.json({ error: "Yêu cầu không hợp lệ" }, { status: 400 });
  }
  // Ảnh hoạt động / chứng nhận: chỉ ADMIN & BÍ THƯ. Ảnh đại diện: mọi người dùng cho chính mình.
  if (folder === "documents") {
    // Tài liệu đính kèm bài viết: chỉ Admin.
    if (user.role !== "ADMIN") return NextResponse.json({ error: "Không có quyền tải tệp lên" }, { status: 403 });
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!DOC_EXT.has(ext)) return NextResponse.json({ error: "Chỉ nhận PDF, Word, Excel, PowerPoint" }, { status: 400 });
    if (file.size > MAX_DOC_BYTES) return NextResponse.json({ error: "Tệp tối đa 10MB" }, { status: 400 });
    if (!isCloudinaryConfigured()) return NextResponse.json({ error: "Chưa cấu hình Cloudinary trên máy chủ" }, { status: 503 });
    try {
      const res = await uploadDocument(Buffer.from(await file.arrayBuffer()), file.name);
      return NextResponse.json({ url: res.secure_url, publicId: res.public_id, name: file.name, size: file.size, mime: file.type || ext });
    } catch (e) {
      console.error("[upload:doc]", e);
      return NextResponse.json({ error: "Tải tệp lên thất bại" }, { status: 502 });
    }
  }
  if (folder !== "members" && user.role === "MEMBER") {
    return NextResponse.json({ error: "Không có quyền tải ảnh lên" }, { status: 403 });
  }
  if (!ALLOWED.has(file.type)) return NextResponse.json({ error: "Chỉ chấp nhận ảnh JPG, PNG hoặc WebP" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Ảnh tối đa 5MB" }, { status: 400 });
  if (!isCloudinaryConfigured()) {
    return NextResponse.json({ error: "Chưa cấu hình Cloudinary trên máy chủ" }, { status: 503 });
  }
  try {
    const res = await uploadImage(Buffer.from(await file.arrayBuffer()), folder);
    return NextResponse.json({ imageUrl: res.secure_url, publicId: res.public_id });
  } catch (e) {
    console.error("[upload]", e);
    return NextResponse.json({ error: "Tải ảnh lên thất bại" }, { status: 502 });
  }
}
