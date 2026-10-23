import type { UploadedImage } from "@/components/ui/image-upload";

export type UiKind = "CHOICE" | "TF" | "FILL" | "ORDER";
export type QForm = { key?: string; ui: UiKind; text: string; image: UploadedImage; options: string[]; correct: number; explanation: string };
export type QuizFormValue = { title: string; description: string; theme: string; points: number; seconds: number; startsAt: string; endsAt: string; published: boolean; notify: boolean; /** Rỗng: toàn trường; có giá trị: chỉ các Chi đoàn này. */ departmentIds: string[]; questions: QForm[] };


export const blank = (ui: UiKind): QForm => ({ ui, text: "", image: null, options: ui === "TF" ? ["Đúng", "Sai"] : ui === "CHOICE" ? ["", "", "", ""] : ui === "ORDER" ? ["", "", ""] : [""], correct: 0, explanation: "" });

export function emptyQuiz(): QuizFormValue {
  return { title: "", description: "", theme: "auto", points: 5, seconds: 20, startsAt: "", endsAt: "", published: true, notify: true, departmentIds: [], questions: [blank("CHOICE"), blank("CHOICE"), blank("TF")] };
}

