"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
import { deleteQuizAction, saveGameCapAction, setQuizPublishedAction } from "@/actions/games";
import { Button, buttonClass } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { ConfirmButton } from "@/components/ui/modal";

export function QuizRowActions({ id, published }: { id: string; published: boolean }) {
  const router = useRouter();
  return (
    <span className="inline-flex items-center gap-1">
      <Button size="sm" variant="ghost" aria-label={published ? "Ẩn trò chơi" : "Mở trò chơi"} title={published ? "Ẩn trò chơi" : "Mở trò chơi"} onClick={async () => { const r = await setQuizPublishedAction(id, !published); if (!r.ok) toast.error(r.error); else toast.success(r.message); router.refresh(); }}>{published ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}</Button>
      <Link href={`/quizzes/${id}/edit`} className={buttonClass("ghost", "sm")} aria-label="Sửa"><Pencil className="size-3.5" /></Link>
      <ConfirmButton triggerVariant="ghost" triggerClassName="text-danger" triggerLabel="Xóa" trigger={<Trash2 className="size-3.5" />} title="Xóa trò chơi?" danger confirmLabel="Xóa"
        description="Câu hỏi và kết quả của trò chơi sẽ bị xóa. Điểm đã cộng cho đoàn viên vẫn được giữ nguyên."
        onConfirm={async () => { const r = await deleteQuizAction(id); if (!r.ok) toast.error(r.error); else toast.success(r.message); router.refresh(); }} />
    </span>
  );
}

export function GameCapForm({ cap }: { cap: number }) {
  const router = useRouter();
  const [v, setV] = useState(String(cap));
  const [busy, setBusy] = useState(false);
  return (
    <form className="flex flex-wrap items-end gap-2" onSubmit={async (e) => { e.preventDefault(); setBusy(true); const r = await saveGameCapAction(Number(v)); setBusy(false); if (!r.ok) toast.error(r.error); else { toast.success(r.message); router.refresh(); } }}>
      <label className="block"><span className="mb-1 block text-[13px] font-medium">Trần điểm trò chơi mỗi đoàn viên mỗi tuần</span><Input type="number" min={0} max={200} className="w-32" value={v} onChange={(e) => setV(e.target.value)} /></label>
      <Button type="submit" size="sm" loading={busy}>Lưu</Button>
      <p className="basis-full text-xs text-muted">Điểm trò chơi được cộng vào điểm thi đua của Chi đoàn, nhưng mỗi đoàn viên chỉ tích tối đa số điểm này từ trò chơi trong một tuần (từ thứ Hai đến Chủ nhật). 0 nghĩa là trò chơi không cộng điểm.</p>
    </form>
  );
}
