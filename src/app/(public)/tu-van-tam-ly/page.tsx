import type { Metadata } from "next";
import { PageTitle } from "@/components/public/blocks";
import { CounselingForm } from "@/components/public/counseling-form";
import { getSiteSettings } from "@/lib/services/site-settings";
import { Heart, Lightbulb, Phone, Shield, Sparkles, UserCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Tư vấn tâm lý học đường",
  description:
    "Phòng tư vấn tâm lý học đường Đoàn trường THPT Sơn Hà - Lắng nghe, thấu hiểu, đồng hành và hỗ trợ đoàn viên, học sinh vượt qua áp lực học tập và cuộc sống.",
};

export default async function TuVanTamLyPage() {
  const settings = await getSiteSettings();

  return (
    <div className="space-y-6">
      <PageTitle
        title="Tư vấn tâm lý học đường"
        description="Không gian an toàn để bạn lắng nghe chính mình, gỡ bỏ những âu lo và nhận được sự đồng hành từ thầy cô phụ trách tâm lý học đường."
      />

      {/* Thông điệp mở đầu */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex items-start gap-3 rounded-lg border border-border bg-white/80 p-4 shadow-xs">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
            <Heart className="size-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Lắng nghe chân thành</h3>
            <p className="mt-1 text-xs text-slate-600">
              Mọi cảm xúc của bạn đều xứng đáng được tôn trọng và thấu hiểu, không có bất kỳ sự phán xét nào.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-lg border border-border bg-white/80 p-4 shadow-xs">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
            <Shield className="size-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Bảo mật tuyệt đối</h3>
            <p className="mt-1 text-xs text-slate-600">
              Danh tính và nội dung chia sẻ của bạn được giữ kín hoàn toàn theo đúng quy chuẩn đạo đức tư vấn.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-lg border border-border bg-white/80 p-4 shadow-xs">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
            <UserCheck className="size-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Đồng hành cùng bạn</h3>
            <p className="mt-1 text-xs text-slate-600">
              Cùng bạn tháo gỡ những vướng mắc về học tập, quan hệ bạn bè, gia đình hay những trăn trở tuổi mới lớn.
            </p>
          </div>
        </div>
      </div>

      {/* Form gửi tâm sự bảo mật */}
      <CounselingForm />

      {/* Kênh liên hệ trực tiếp & Cẩm nang */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-white/85 p-5 shadow-xs">
          <div className="flex items-center gap-2 text-primary font-semibold">
            <Phone className="size-4" />
            <span>Kênh hỗ trợ trực tiếp tại trường</span>
          </div>
          <p className="mt-2 text-xs text-slate-600 leading-relaxed">
            Ngoài hòm thư trực tuyến, bạn cũng có thể gặp trực tiếp thầy cô Tổ tư vấn tâm lý hoặc liên hệ qua đường dây nóng của Đoàn trường:
          </p>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-primary" />
              <span><strong>Địa điểm:</strong> Phòng Tư vấn tâm lý học đường (Khu hiệu bộ, Trường THPT Sơn Hà)</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-primary" />
              <span><strong>Hotline Đoàn trường:</strong> {settings.phone || "Liên hệ qua Văn phòng Đoàn"}</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-primary" />
              <span><strong>Email tiếp nhận:</strong> {settings.email || "doantruong.thptsonha@gmail.com"}</span>
            </li>
          </ul>
        </div>

        <div className="rounded-xl border border-border bg-white/85 p-5 shadow-xs">
          <div className="flex items-center gap-2 text-amber-600 font-semibold">
            <Lightbulb className="size-4" />
            <span>Gợi ý giúp bạn cân bằng cảm xúc</span>
          </div>
          <ul className="mt-3 space-y-2.5 text-xs text-slate-600 leading-relaxed">
            <li className="flex items-start gap-2">
              <Sparkles className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
              <span><strong>Thở sâu khi căng thẳng:</strong> Hít vào 4 giây, giữ hơi 4 giây, thở ra 4 giây để nhịp tim và tâm trí dịu lại.</span>
            </li>
            <li className="flex items-start gap-2">
              <Sparkles className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
              <span><strong>Viết ra những suy nghĩ:</strong> Đặt bút viết lên trang giấy giúp bạn nhận diện rõ hơn cảm xúc của mình.</span>
            </li>
            <li className="flex items-start gap-2">
              <Sparkles className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
              <span><strong>Chia sẻ không phải là yếu đuối:</strong> Tìm kiếm sự giúp đỡ là biểu hiện của lòng dũng cảm và yêu thương bản thân.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

