import type { Prisma } from "@prisma/client";

/** Các tiêu chí sắp xếp danh sách thành viên (dùng chung cho trang Đoàn viên & thanh niên và trang Chi đoàn). */
export const MEMBER_SORTS: { value: string; label: string }[] = [
  { value: "ten", label: "Tên A → Z" },
  { value: "ten_z", label: "Tên Z → A" },
  { value: "ma", label: "Mã tăng dần" },
  { value: "ma_moi", label: "Mới thêm trước" },
  { value: "vao_doan_moi", label: "Ngày vào Đoàn: mới nhất" },
  { value: "vao_doan_cu", label: "Ngày vào Đoàn: cũ nhất" },
  { value: "diem", label: "Điểm cao nhất" },
];

export function memberOrderBy(sort: string | undefined, fallback: Prisma.MemberOrderByWithRelationInput[]): Prisma.MemberOrderByWithRelationInput[] {
  switch (sort) {
    case "ten": return [{ fullName: "asc" }];
    case "ten_z": return [{ fullName: "desc" }];
    case "ma": return [{ code: "asc" }];
    case "ma_moi": return [{ createdAt: "desc" }, { code: "desc" }];
    case "vao_doan_moi": return [{ joinedAt: { sort: "desc", nulls: "last" } }, { fullName: "asc" }];
    case "vao_doan_cu": return [{ joinedAt: { sort: "asc", nulls: "last" } }, { fullName: "asc" }];
    case "diem": return [{ totalPoints: "desc" }, { fullName: "asc" }];
    default: return fallback;
  }
}

/** Khối lớp lọc theo tên Chi đoàn (10A1 -> khối 10). */
export const GRADE_OPTIONS = [{ value: "10", label: "Khối 10" }, { value: "11", label: "Khối 11" }, { value: "12", label: "Khối 12" }];
export const gradeOf = (v: string | undefined) => (v === "10" || v === "11" || v === "12" ? v : "");
