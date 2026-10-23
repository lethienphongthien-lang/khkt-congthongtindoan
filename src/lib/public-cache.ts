import { revalidatePath, updateTag } from "next/cache";
import { PUBLIC_TAG } from "@/lib/cache";

/** Gọi sau mọi thao tác làm đổi nội dung công khai (bài viết, cài đặt, Chi đoàn…): xóa bộ nhớ đệm của trang công khai để người xem thấy bản mới ngay. Chỉ dùng trong Server Action. */
export function invalidatePublic() {
  revalidatePath("/", "layout");
  updateTag(PUBLIC_TAG);
}
