import type { Tone } from "@/components/ui/misc";

/** Nhóm hành động trong nhật ký (bộ lọc) và tiền tố mã hành động thuộc từng nhóm. */
export const AUDIT_GROUPS: { value: string; label: string; prefixes: string[] }[] = [
  { value: "security", label: "Đăng nhập và tài khoản", prefixes: ["auth.", "account.", "leader.", "passkey."] },
  { value: "people", label: "Đoàn viên và Chi đoàn", prefixes: ["member.", "points.", "department.", "school_year.", "emulation."] },
  { value: "activity", label: "Hoạt động và điểm danh", prefixes: ["activity.", "attendance.", "schedule.", "volunteer."] },
  { value: "content", label: "Nội dung và cộng đồng", prefixes: ["article.", "sitepage.", "site.", "marquee.", "category.", "report.", "post.", "poll.", "confession.", "feedback.", "quiz.", "badge."] },
  { value: "system", label: "Hệ thống và AI", prefixes: ["data.", "ai."] },
];

/** Mô tả hành động bằng tiếng Việt dễ hiểu cho người quản trị. */
const LABELS: Record<string, string> = {
  "auth.login": "Đăng nhập", "auth.login_passkey": "Đăng nhập bằng khóa bảo mật", "auth.change_password": "Đổi mật khẩu",
  "account.rename": "Đổi tên tài khoản", "account.reset_password": "Đặt lại mật khẩu cho tài khoản",
  "passkey.add": "Thêm khóa đăng nhập nhanh", "passkey.remove": "Gỡ khóa đăng nhập nhanh",
  "leader.create": "Tạo tài khoản lãnh đạo", "leader.update": "Cập nhật tài khoản lãnh đạo", "leader.reset_password": "Đặt lại mật khẩu lãnh đạo",
  "member.create": "Thêm đoàn viên", "member.update": "Sửa hồ sơ đoàn viên", "member.self_update": "Đoàn viên tự sửa thông tin", "member.import": "Nhập danh sách đoàn viên từ Excel",
  "member.delete": "Xóa đoàn viên", "member.delete_bulk": "Xóa nhiều đoàn viên", "member.bulk_add": "Thêm danh sách đoàn viên vào Chi đoàn",
  "member.admit": "Kết nạp đoàn viên", "member.admit_bulk": "Kết nạp nhiều đoàn viên", "points.adjust": "Điều chỉnh điểm của đoàn viên",
  "department.create": "Tạo Chi đoàn", "department.update": "Sửa thông tin Chi đoàn", "department.delete": "Xóa Chi đoàn",
  "department.assign_secretary": "Phân công bí thư Chi đoàn", "department.remove_secretary": "Gỡ bí thư Chi đoàn",
  "school_year.sync": "Cập nhật năm học cho các Chi đoàn", "school_year.save": "Lưu lịch năm học", "school_year.reset": "Đặt lại lịch năm học",
  "emulation.create": "Ghi điểm thi đua cho Chi đoàn", "emulation.createBatch": "Ghi điểm thi đua hàng loạt", "emulation.delete": "Xóa bản ghi điểm thi đua",
  "activity.create": "Tạo hoạt động", "activity.update": "Sửa hoạt động", "activity.delete": "Xóa hoạt động", "activity.cancel": "Hủy hoạt động",
  "activity.register": "Đăng ký hoạt động", "activity.unregister": "Hủy đăng ký hoạt động",
  "attendance.rotate_qr": "Đổi mã QR điểm danh", "attendance.revoke": "Thu hồi điểm danh",
  "volunteer.request": "Gửi đăng ký tình nguyện", "volunteer.approve": "Duyệt đăng ký tình nguyện", "volunteer.reject": "Từ chối đăng ký tình nguyện", "volunteer.cancel_request": "Rút đăng ký tình nguyện",
  "schedule.copy_week": "Sao chép lịch công tác tuần", "schedule.delete_item": "Xóa mục lịch công tác",
  "article.create": "Đăng bài viết", "article.update": "Sửa bài viết", "article.delete": "Xóa bài viết",
  "sitepage.update": "Sửa trang giới thiệu", "site.settings": "Sửa thông tin website", "site.menu": "Sửa menu website",
  "marquee.create": "Thêm dòng chữ chạy", "marquee.delete": "Xóa dòng chữ chạy",
  "category.create": "Tạo danh mục", "category.rename": "Đổi tên danh mục", "category.delete": "Xóa danh mục",
  "report.create": "Đăng báo cáo Chi đoàn", "report.update": "Sửa báo cáo Chi đoàn", "report.delete": "Xóa báo cáo Chi đoàn",
  "post.create": "Đăng bài lên bảng tin", "post.delete": "Xóa bài trên bảng tin", "poll.create": "Tạo bình chọn", "poll.delete": "Xóa bình chọn", "confession.approve": "Duyệt confession", "confession.reject": "Từ chối confession", "confession.delete": "Xóa confession", "confession.comment.delete": "Xóa bình luận confession",
  "feedback.update": "Xử lý góp ý", "feedback.delete": "Xóa góp ý",
  "quiz.create": "Tạo trò chơi tích điểm", "quiz.update": "Sửa trò chơi tích điểm", "quiz.delete": "Xóa trò chơi tích điểm", "quiz.cap": "Đổi trần điểm trò chơi mỗi tuần",
  "badge.delete": "Xóa huy hiệu", "data.cleanup": "Dọn dẹp dữ liệu cũ", "ai.assist": "Dùng trợ lý AI", "ai.chat": "Khách hỏi chatbot",
};

/** Tên đối tượng bị tác động. */
export const TARGET_LABELS: Record<string, string> = {
  User: "Tài khoản", Member: "Đoàn viên", Activity: "Hoạt động", Article: "Bài viết", Department: "Chi đoàn", Quiz: "Trò chơi", Poll: "Bình chọn", Confession: "Confession",
  ChapterReport: "Báo cáo Chi đoàn", Badge: "Huy hiệu", MarqueeItem: "Chữ chạy", ArticleCategory: "Danh mục", ActivityCategory: "Loại hoạt động",
  Feedback: "Góp ý", Post: "Bài bảng tin", SitePage: "Trang giới thiệu", SiteSetting: "Cài đặt", SchoolYear: "Năm học", WeeklySchedule: "Lịch công tác", System: "Hệ thống", Chat: "Chatbot",
};

export const actionLabel = (a: string) => LABELS[a] ?? a;

/** Màu nhấn theo tính chất: xóa/thu hồi/hủy = đỏ, tạo mới = xanh lá, đổi mật khẩu/đặt lại = vàng, sửa = xanh dương, còn lại = xám. */
export function actionTone(a: string): Tone {
  if (/\.(delete|delete_bulk|revoke|cancel|cancel_request|remove|remove_secretary|cleanup|reset|reject)$/.test(a)) return "red";
  if (/(reset_password|change_password)$/.test(a)) return "amber";
  if (/\.(create|import|bulk_add|admit|admit_bulk|add|register|assign_secretary|copy_week|approve|request)$/.test(a)) return "green";
  if (/\.(update|rename|self_update|adjust|settings|save|sync|cap|rotate_qr)$/.test(a)) return "blue";
  return "gray";
}

const META_LABELS: Record<string, string> = { title: "Tiêu đề", name: "Tên", code: "Mã", text: "Nội dung", question: "Câu hỏi", reason: "Lý do", points: "Điểm", username: "Tên đăng nhập", position: "Chức vụ", week: "Tuần", schoolYear: "Năm học", status: "Trạng thái" };
/** Tóm tắt thông tin kèm theo của một dòng nhật ký thành câu ngắn dễ đọc. */
export function metaSummary(meta: unknown): string {
  if (!meta || typeof meta !== "object") return "";
  const m = meta as Record<string, unknown>;
  const parts: string[] = [];
  for (const [k, label] of Object.entries(META_LABELS)) { const v = m[k]; if (typeof v === "string" || typeof v === "number") parts.push(`${label}: ${String(v).slice(0, 70)}`); }
  if (Array.isArray(m.fields) && m.fields.length) parts.push(`${m.fields.length} trường đã sửa`);
  return parts.slice(0, 3).join(" · ");
}
