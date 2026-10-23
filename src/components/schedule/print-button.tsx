"use client";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintButton() {
  return <Button variant="secondary" size="sm" className="no-print" onClick={() => window.print()}><Printer className="size-4" />In lịch</Button>;
}
