import { EMULATION_WEEK_MAX } from "@/lib/emulation-period";
import { z } from "zod";
import { ID_MSG, ID_RE, MIN_BIRTH, MIN_ID_ISSUE, emailField, pastDate, personName, phoneField } from "./rules";

const emptyToUndef = (v: unknown) => (v === "" || v === null ? undefined : v);
const optionalText = (max = 2000) => z.preprocess(emptyToUndef, z.string().trim().max(max).optional());
const optionalDate = z.preprocess(emptyToUndef, z.coerce.date().optional());
const birthDate = pastDate({ min: MIN_BIRTH, msgFuture: "Ngày sinh không được sau ngày hiện tại", msgPast: "Ngày sinh không hợp lệ (quá xa về trước)", msgInvalid: "Ngày sinh không hợp lệ" });
const joinDate = pastDate({ min: "1990-01-01", msgFuture: "Ngày vào Đoàn không được sau ngày hiện tại", msgPast: "Ngày vào Đoàn không hợp lệ", msgInvalid: "Ngày vào Đoàn không hợp lệ" });
const birthJoinOrder = { message: "Ngày vào Đoàn phải sau ngày sinh", path: ["joinedAt"] };
const joinedAfterBirth = (v: { dateOfBirth?: Date; joinedAt?: Date }) => !v.dateOfBirth || !v.joinedAt || v.joinedAt > v.dateOfBirth;

export const loginSchema = z.object({
  username: z.string().trim().min(1, "Vui lòng nhập tên đăng nhập"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Vui lòng nhập mật khẩu hiện tại"),
    newPassword: z.string().min(8, "Mật khẩu mới tối thiểu 8 ký tự").max(72)
      .regex(/[A-Za-z]/, "Mật khẩu cần có chữ cái").regex(/\d/, "Mật khẩu cần có chữ số"),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, { path: ["confirmPassword"], message: "Mật khẩu xác nhận không khớp" })
  .refine((v) => v.newPassword !== v.currentPassword, { path: ["newPassword"], message: "Mật khẩu mới phải khác mật khẩu hiện tại" });

export const memberSchema = z.object({
  fullName: personName(),
  gender: z.preprocess(emptyToUndef, z.enum(["Nam", "Nữ", "Khác"]).optional()),
  dateOfBirth: birthDate,
  joinedAt: joinDate,
  /** true: đoàn viên; false: thanh niên (học sinh chưa vào Đoàn, không có ngày vào Đoàn). */
  isDoanVien: z.boolean().default(true),
  cohort: z.preprocess(emptyToUndef, z.coerce.number().int().min(2000).max(2100).optional()),
  departmentId: z.string().min(1, "Chọn Chi đoàn"),
  status: z.enum(["ACTIVE", "TRANSFERRED", "GRADUATED"]).default("ACTIVE"),
  avatarUrl: optionalText(500),
  avatarPublicId: optionalText(300),
}).refine(joinedAfterBirth, birthJoinOrder);
export type MemberInput = z.infer<typeof memberSchema>;

export const departmentSchema = z.object({
  name: z.string().trim().min(1, "Nhập tên Chi đoàn").max(50),
  description: optionalText(500),
  startYear: z.number().int().min(2000, "Năm không hợp lệ").max(2100, "Năm không hợp lệ").optional(),
  /** Chi đoàn giáo viên: chỉ chọn lúc tạo; không có khối/khóa, không lên lớp, không tính vào thống kê và thi đua của học sinh. */
  isTeacher: z.boolean().default(false),
  members: z.string().max(20000).optional(), // danh sách họ tên đoàn viên (mỗi dòng một người) để tự tạo tài khoản
  youth: z.string().max(20000).optional(), // danh sách họ tên thanh niên (học sinh chưa vào Đoàn)
});

/** Bí thư là một đoàn viên của Chi đoàn được gán thêm chức vụ. */
export const secretarySchema = z.object({
  departmentId: z.string().min(1),
  memberId: z.string().min(1, "Chọn đoàn viên làm bí thư"),
});

export const activitySchema = z
  .object({
    title: z.string().trim().min(3, "Tên hoạt động tối thiểu 3 ký tự").max(150),
    description: optionalText(5000),
    location: z.string().trim().min(2, "Nhập địa điểm").max(200),
    startAt: z.coerce.date({ message: "Chọn thời gian bắt đầu" }),
    endAt: z.coerce.date({ message: "Chọn thời gian kết thúc" }),
    categoryId: z.string().min(1, "Chọn loại hoạt động"),
    departmentId: z.preprocess(emptyToUndef, z.string().optional()),
    maxParticipants: z.preprocess(emptyToUndef, z.coerce.number().int().min(1, "Tối thiểu 1").max(5000).optional()),
    points: z.coerce.number().int().min(0, "Điểm không âm").max(100),
    volunteerHours: z.coerce.number().min(0).max(100).default(0),
    imageUrl: optionalText(500),
    imagePublicId: optionalText(300),
  })
  .refine((v) => v.endAt > v.startAt, { path: ["endAt"], message: "Thời gian kết thúc phải sau thời gian bắt đầu" });

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Nhập tên loại").max(50),
  defaultPoints: z.coerce.number().int().min(0).max(100),
});

export const badgeSchema = z.object({
  name: z.string().trim().min(1, "Nhập tên huy hiệu").max(60),
  description: z.string().trim().min(1, "Nhập mô tả").max(200),
  icon: z.enum(["award", "heart", "leaf", "star", "trophy", "flame", "book-open", "medal"]),
  criteria: z.enum(["ACTIVITY_COUNT", "VOLUNTEER_HOURS", "TOTAL_POINTS", "CATEGORY_COUNT", "GAME_COUNT"]),
  threshold: z.coerce.number().int().min(1, "Tối thiểu 1"),
  categoryId: z.preprocess(emptyToUndef, z.string().optional()),
});

export const pointAdjustSchema = z.object({
  memberId: z.string().min(1),
  points: z.coerce.number().int().min(-100).max(100).refine((n) => n !== 0, "Số điểm khác 0"),
  reason: z.string().trim().min(3, "Nhập lý do").max(200),
});

export const formToObject = (fd: FormData) => Object.fromEntries(fd.entries());

export const postSchema = z.object({
  content: z.string().trim().min(1, "Nhập nội dung bài viết").max(5000, "Tối đa 5000 ký tự"),
  departmentId: z.preprocess(emptyToUndef, z.string().optional()),
  imageUrl: optionalText(500),
  imagePublicId: optionalText(300),
});

export const commentSchema = z.object({ content: z.string().trim().min(1, "Nhập nội dung bình luận").max(1000, "Tối đa 1000 ký tự") });

export const emulationSchema = z.object({
  departmentId: z.string().min(1, "Chọn Chi đoàn"),
  points: z.coerce.number().int().min(-EMULATION_WEEK_MAX, `Tối thiểu -${EMULATION_WEEK_MAX}`).max(EMULATION_WEEK_MAX, `Tối đa ${EMULATION_WEEK_MAX}`).refine((n) => n !== 0, "Số điểm khác 0"),
  reason: z.string().trim().min(3, "Nhập nội dung ghi nhận").max(200),
  recordedAt: z.coerce.date({ message: "Chọn ngày ghi nhận" }),
});

export const emulationBatchSchema = z.object({
  reason: z.string().trim().min(3, "Nhập nội dung ghi nhận").max(200),
  recordedAt: z.coerce.date({ message: "Chọn ngày ghi nhận" }),
  items: z.array(z.object({
    departmentId: z.string().min(1),
    points: z.coerce.number().int().min(-EMULATION_WEEK_MAX, `Tối thiểu -${EMULATION_WEEK_MAX}`).max(EMULATION_WEEK_MAX, `Tối đa ${EMULATION_WEEK_MAX}`),
  })).max(200),
});

export const articleSchema = z.object({
  kind: z.enum(["NEWS", "PLAN", "EVENT", "ANNOUNCEMENT", "STORY", "CAREER", "DOCUMENT"]),
  title: z.string().trim().min(3, "Tiêu đề tối thiểu 3 ký tự").max(200),
  summary: optionalText(500),
  content: z.string().trim().min(1, "Nhập nội dung").max(200000),
  coverUrl: optionalText(500),
  coverPublicId: optionalText(300),
  eventAt: optionalDate,
  eventLocation: optionalText(200),
  /** Ngày giờ đăng; để trống thì lấy thời điểm đăng. Chọn thời điểm trong tương lai = hẹn giờ (bài chỉ hiện công khai từ lúc đó). */
  publishedAt: optionalDate,
  departmentId: optionalText(40),
  categoryId: optionalText(40),
  published: z.coerce.boolean().default(true),
  attachments: z.array(z.object({
    name: z.string().trim().min(1).max(200),
    url: z.url().max(600),
    publicId: z.string().min(1).max(300),
    size: z.coerce.number().int().min(0).max(50_000_000).default(0),
    mime: z.string().max(150).optional(),
  })).max(10, "Tối đa 10 tệp đính kèm").default([]),
});

const fileAttachment = z.object({
  name: z.string().trim().min(1).max(200),
  url: z.url().max(600),
  publicId: z.string().min(1).max(300),
  size: z.coerce.number().int().min(0).max(50_000_000).default(0),
  mime: z.string().max(150).optional(),
});

export const sitePageSchema = z.object({
  /** Tệp đính kèm khi trang không chia tab. */
  attachments: z.array(fileAttachment).max(10, "Tối đa 10 tệp đính kèm").default([]),
  content: z.string().max(200000).default(""),
  /** Chia trang thành nhiều tab, mỗi tab một nội dung riêng (tối đa 10). */
  tabs: z.array(z.object({ title: z.string().trim().min(1, "Nhập tên cho mọi tab").max(40, "Tên tab tối đa 40 ký tự"), content: z.string().max(200000), attachments: z.array(fileAttachment).max(10, "Tối đa 10 tệp mỗi tab").default([]) })).max(10, "Tối đa 10 tab").optional(),
});

export const reportSchema = z.object({
  departmentId: z.string().optional(), // bí thư: server tự gán Chi đoàn của mình
  title: z.string().trim().min(3, "Tiêu đề tối thiểu 3 ký tự").max(200),
  content: z.string().trim().min(1, "Nhập nội dung").max(200000),
  imageUrl: optionalText(500),
  imagePublicId: optionalText(300),
});

/** Các trường đoàn viên được TỰ sửa (không gồm lớp, Chi đoàn, khóa, trạng thái, điểm: do Admin quản lý). */
export const ownProfileSchema = z.object({
  fullName: personName(),
  gender: z.preprocess(emptyToUndef, z.enum(["Nam", "Nữ", "Khác"]).optional()),
  dateOfBirth: birthDate,
  joinedAt: joinDate,
}).refine(joinedAfterBirth, birthJoinOrder);

/** Hồ sơ đoàn viên chi tiết: mọi trường đều tùy chọn; chuỗi rỗng tính là chưa nhập. */
const detailText = (max = 200) => z.preprocess(emptyToUndef, z.string().trim().max(max).optional());
export const memberDetailSchema = z.object({
  ethnicity: detailText(40), religion: detailText(40),
  idNumber: z.preprocess(emptyToUndef, z.string().trim().regex(ID_RE, ID_MSG).optional()),
  idIssuedAt: pastDate({ min: MIN_ID_ISSUE, msgFuture: "Ngày cấp không được sau ngày hiện tại", msgPast: "Ngày cấp không hợp lệ", msgInvalid: "Ngày cấp không hợp lệ" }), idIssuedPlace: detailText(),
  phone: phoneField,
  email: emailField,
  occupation: detailText(60),
  hometownProvince: detailText(80), hometownWard: detailText(80), hometownAddress: detailText(200),
  permanentProvince: detailText(80), permanentWard: detailText(80), permanentAddress: detailText(200),
  currentProvince: detailText(80), currentWard: detailText(80), currentAddress: detailText(200),
  educationLevel: detailText(60), specialization: detailText(100), politicalTheory: detailText(60), itSkill: detailText(100), foreignLanguage: detailText(100),
});
export type MemberDetailInput = z.infer<typeof memberDetailSchema>;

/** Bí thư đăng ký một buổi tình nguyện cho cả Chi đoàn (ví dụ quét sân): tự nhập công việc, thời gian, giờ tình nguyện và điểm mỗi em. */
export const volunteerSchema = z.object({
  task: z.string().trim().min(2, "Nhập công việc tình nguyện").max(100),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Chọn ngày"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Chọn giờ bắt đầu"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Chọn giờ kết thúc"),
  location: z.string().trim().min(2, "Nhập khu vực/địa điểm").max(150),
  hours: z.coerce.number().min(0.25, "Tối thiểu 15 phút").max(12, "Tối đa 12 giờ"),
  points: z.coerce.number().int().min(0, "Điểm không âm").max(20, "Tối đa 20 điểm mỗi em"),
  note: optionalText(500),
  departmentId: z.preprocess(emptyToUndef, z.string().optional()),
}).superRefine((v, ctx) => {
  const today = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
  const max = new Date(Date.now() + 7 * 3600_000 + 366 * 86400_000).toISOString().slice(0, 10);
  if (v.date < today) ctx.addIssue({ code: "custom", path: ["date"], message: "Ngày tình nguyện không được ở quá khứ" });
  else if (v.date > max) ctx.addIssue({ code: "custom", path: ["date"], message: "Chỉ đăng ký trong vòng một năm tới" });
  const mins = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  if (mins(v.endTime) <= mins(v.startTime)) ctx.addIssue({ code: "custom", path: ["endTime"], message: "Giờ kết thúc phải sau giờ bắt đầu" });
  else if (v.hours * 60 > mins(v.endTime) - mins(v.startTime) + 1) ctx.addIssue({ code: "custom", path: ["hours"], message: "Số giờ không được lớn hơn khoảng thời gian từ giờ bắt đầu đến giờ kết thúc" });
});
export type VolunteerInput = z.infer<typeof volunteerSchema>;

/** Kiểm tra ở trình duyệt trước khi gửi: trả về lỗi đầu tiên, hoặc null nếu hợp lệ. */
export function firstError(schema: z.ZodType, data: unknown): string | null {
  const r = schema.safeParse(data);
  return r.success ? null : (r.error.issues[0]?.message ?? "Dữ liệu không hợp lệ");
}
