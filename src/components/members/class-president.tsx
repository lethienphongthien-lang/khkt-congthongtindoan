"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { setClassPresidentAction } from "@/actions/departments";
import { reportResult } from "@/components/ui/submit";
export function ClassPresident({ departmentId, current, currentMemberId, candidates, canEdit }: { departmentId: string; current: string | null; currentMemberId: string | null; candidates: { id: string; fullName: string }[]; canEdit: boolean }) {
  const [selected, setSelected] = useState(currentMemberId ?? "");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return <div className="my-4 space-y-2 rounded-lg border bg-white p-4"><h2 className="font-semibold">Lớp trưởng: {current ?? "Chưa phân công"}</h2>
    {canEdit && <div className="flex flex-wrap gap-2"><Select value={selected} onChange={(e) => setSelected(e.target.value)}><option value="">Bỏ phân công lớp trưởng</option>{candidates.map((m) => <option key={m.id} value={m.id}>{m.fullName}</option>)}</Select>
      <Button loading={busy} onClick={async () => { setBusy(true); try { if (reportResult(await setClassPresidentAction({ departmentId, memberId: selected || null }))) router.refresh(); } finally { setBusy(false); } }}>Lưu lớp trưởng</Button></div>}
  </div>;
}
