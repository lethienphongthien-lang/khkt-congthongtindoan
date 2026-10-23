/** Cấu hình các trường của hồ sơ đoàn viên chi tiết (theo mẫu Sổ đoàn viên điện tử): dùng chung cho form, trang xem và kiểm tra dữ liệu. */
export type DetailKey =
  | "ethnicity" | "religion" | "idNumber" | "idIssuedAt" | "idIssuedPlace" | "phone" | "email" | "occupation"
  | "hometownProvince"  | "hometownWard" | "hometownAddress" | "permanentProvince"  | "permanentWard" | "permanentAddress" | "currentProvince"  | "currentWard" | "currentAddress"
  | "educationLevel" | "specialization" | "politicalTheory" | "itSkill" | "foreignLanguage";

export type DetailField = { key: DetailKey; label: string; type?: "text" | "date" | "select" | "bool" | "province" | "ward" | "search"; /** Cặp tỉnh/xã: tên nhóm địa chỉ (hometown, permanent, current). */ pair?: string; options?: string[]; list?: string; hint?: string };
export type DetailGroup = { /** Nhóm địa chỉ (hometown, permanent, current): cho phép sao chép nhanh từ nhóm địa chỉ khác. */ address?: "hometown" | "permanent" | "current"; title: string; note?: string; fields: DetailField[] };

export const ETHNICITIES = ["Kinh", "Tày", "Thái", "Mường", "Khmer", "Hoa", "Nùng", "H'Mông", "Dao", "Gia Rai", "Ê Đê", "Ba Na", "Xơ Đăng", "Sán Chay", "Cơ Ho", "Chăm", "Sán Dìu", "Hrê", "Ra Glai", "Mnông", "Thổ", "Xtiêng", "Khơ Mú", "Bru - Vân Kiều", "Cơ Tu", "Giáy", "Giẻ Triêng", "Tà Ôi", "Mạ", "Co", "Chơ Ro", "Xinh Mun", "Hà Nhì", "Chu Ru", "Lào", "La Chí", "Kháng", "Phù Lá", "La Hủ", "La Ha", "Pà Thẻn", "Lự", "Ngái", "Chứt", "Lô Lô", "Mảng", "Cơ Lao", "Bố Y", "Cống", "Si La", "Pu Péo", "Rơ Măm", "Brâu", "Ơ Đu"];

export const DETAIL_GROUPS: DetailGroup[] = [
  { title: "Thông tin cá nhân", note: "Nhóm thông tin nhạy cảm: chỉ Admin và chính đoàn viên xem được.", fields: [
    { key: "ethnicity", label: "Dân tộc", type: "search", options: ETHNICITIES },
    { key: "religion", label: "Tôn giáo", type: "select", options: ["Không", "Phật giáo", "Công giáo", "Tin Lành", "Cao Đài", "Hòa Hảo", "Hồi giáo", "Khác"] },
    { key: "idNumber", label: "Số CMND/CCCD" },
    { key: "idIssuedAt", label: "Ngày cấp", type: "date" },
    { key: "idIssuedPlace", label: "Nơi cấp" },
    { key: "phone", label: "Số điện thoại" },
    { key: "email", label: "Email" },
    { key: "occupation", label: "Nghề nghiệp hiện nay", type: "select", options: ["Học sinh", "Sinh viên", "Cán bộ, giáo viên", "Khác"] },
  ] },
  { address: "hometown", title: "Quê quán", fields: [
    { key: "hometownProvince", label: "Tỉnh/Thành phố", type: "province", pair: "hometown" }, { key: "hometownWard", label: "Phường/Xã", type: "ward", pair: "hometown" }, { key: "hometownAddress", label: "Số nhà, đường, thôn/xóm" },
  ] },
  { address: "permanent", title: "Nơi thường trú", fields: [
    { key: "permanentProvince", label: "Tỉnh/Thành phố", type: "province", pair: "permanent" }, { key: "permanentWard", label: "Phường/Xã", type: "ward", pair: "permanent" }, { key: "permanentAddress", label: "Số nhà, đường, thôn/xóm" },
  ] },
  { address: "current", title: "Nơi ở hiện nay", fields: [
    { key: "currentProvince", label: "Tỉnh/Thành phố", type: "province", pair: "current" }, { key: "currentWard", label: "Phường/Xã", type: "ward", pair: "current" }, { key: "currentAddress", label: "Số nhà, đường, thôn/xóm" },
  ] },
  { title: "Học vấn và trình độ", fields: [
    { key: "educationLevel", label: "Trình độ văn hóa", type: "select", options: ["Tiểu học", "THCS", "THPT", "Trung cấp", "Cao đẳng", "Đại học", "Sau đại học"] },
    { key: "specialization", label: "Trình độ chuyên môn" },
    { key: "politicalTheory", label: "Lý luận chính trị", type: "select", options: ["Chưa qua đào tạo", "Sơ cấp", "Trung cấp", "Cao cấp", "Cử nhân"] },
    { key: "itSkill", label: "Trình độ tin học" },
    { key: "foreignLanguage", label: "Ngoại ngữ" },
  ] },
];
export const ALL_DETAIL_FIELDS = DETAIL_GROUPS.flatMap((g) => g.fields);
