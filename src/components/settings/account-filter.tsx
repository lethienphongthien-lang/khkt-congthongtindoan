"use client";
import { Input,Select } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
export function AccountFilter({q,status}:{q:string;status:string}) {
  return <form className="flex flex-wrap gap-2"><input type="hidden" name="tab" value="accounts" /><Input name="q" defaultValue={q} placeholder="Tìm họ tên hoặc tên đăng nhập" aria-label="Tìm tài khoản" className="min-w-48 flex-1" /><Select name="status" defaultValue={status} aria-label="Trạng thái tài khoản" className="w-auto"><option value="">Tất cả trạng thái</option><option value="ACTIVE">Hoạt động</option><option value="LOCKED">Đã khóa</option></Select><Button type="submit" variant="secondary">Tìm</Button></form>;
}
