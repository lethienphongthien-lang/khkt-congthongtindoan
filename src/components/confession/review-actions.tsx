"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Trash2, X } from "lucide-react";
import { deleteConfessionAction, reviewConfessionAction } from "@/actions/confessions";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/modal";
import { reportResult } from "@/components/ui/submit";

export function ConfessionActions({ id, status }: { id: string; status: "PENDING" | "APPROVED" | "REJECTED" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function review(d: "APPROVED" | "REJECTED") { setBusy(true); reportResult(await reviewConfessionAction(id, d)); setBusy(false); router.refresh(); }
  return (
    <div className="flex shrink-0 flex-wrap gap-2">
      {status !== "APPROVED" && <Button loading={busy} onClick={() => review("APPROVED")}><Check className="size-4" />Duyệt</Button>}
      {status === "PENDING" && <Button loading={busy} variant="secondary" onClick={() => review("REJECTED")}><X className="size-4" />Từ chối</Button>}
      {status === "APPROVED" && <Button loading={busy} variant="secondary" onClick={() => review("REJECTED")}>Gỡ xuống</Button>}
      <ConfirmButton triggerVariant="secondary" triggerClassName="text-danger" trigger={<Trash2 className="size-4" />} title="Xóa confession này?" danger confirmLabel="Xóa"
        onConfirm={async () => { reportResult(await deleteConfessionAction(id)); router.refresh(); }} />
    </div>
  );
}
