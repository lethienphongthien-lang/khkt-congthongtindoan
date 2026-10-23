"use client";
import { nameOnly } from "@/lib/validation/rules";
import { toast } from "sonner";
import { firstError } from "@/lib/validation";
import { personName } from "@/lib/validation/rules";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateOwnNameAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { reportResult } from "@/components/ui/submit";

export function NameForm({ initial }: { initial: string }) {
  const router = useRouter();
  const [name, setName] = useState(initial);
  const [busy, setBusy] = useState(false);
  const changed = name.trim() !== initial;
  return (
    <div className="mb-5 flex max-w-md items-end gap-2">
      <Field label="Họ tên" className="flex-1"><Input value={name} maxLength={100} onChange={(e) => setName(nameOnly(e.target.value))} /></Field>
      <Button loading={busy} disabled={!changed || name.trim().length < 2} onClick={async () => {
        const err = firstError(personName("họ tên"), name); if (err) return void toast.error(err);
        setBusy(true); const res = await updateOwnNameAction({ fullName: name }); setBusy(false);
        if (reportResult(res)) router.refresh();
      }}>Lưu</Button>
    </div>
  );
}
