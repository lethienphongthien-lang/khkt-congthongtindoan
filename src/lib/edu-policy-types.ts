/** Kiểu và nhãn dùng chung cho quyền ghi dữ liệu dùng chung (an toàn để import ở client component). */
export type EduDomain = "years" | "classes" | "placement" | "profiles";
export type EduPolicy = Record<EduDomain, boolean> & { managed: boolean };
export const EDU_LABEL: Record<EduDomain, string> = {
  years: "Năm học và học kỳ",
  classes: "Lớp (chi đoàn)",
  placement: "Xếp lớp và chuyển năm học",
  profiles: "Hồ sơ học sinh",
};
export const EDU_OPEN: EduPolicy = { years: true, classes: true, placement: true, profiles: true, managed: false };
export const eduLockedLabels = (p: EduPolicy) => (Object.keys(EDU_LABEL) as EduDomain[]).filter((d) => !p[d]).map((d) => EDU_LABEL[d]);
