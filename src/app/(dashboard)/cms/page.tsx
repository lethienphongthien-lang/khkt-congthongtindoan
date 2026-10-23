import { redirect } from "next/navigation";

/** /cms không có trang riêng (xuất hiện trong breadcrumb): chuyển tới mục đầu tiên. */
export default function CmsIndexPage() {
  redirect("/cms/tin-tuc");
}
