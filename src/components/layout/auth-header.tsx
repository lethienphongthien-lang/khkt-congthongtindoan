import { DoanLogo } from "./logo";

/** Phần đầu các trang xác thực (nền xanh Đoàn): logo lớn (không nền) + tên trường. */
export function AuthHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6 flex flex-col items-center text-center text-white">
      <DoanLogo className="mb-4 h-32 drop-shadow-lg sm:h-36" />
      <h1 className="text-xl font-semibold">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-blue-100">{subtitle}</p>}
    </div>
  );
}
