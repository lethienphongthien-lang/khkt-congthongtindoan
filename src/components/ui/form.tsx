import { forwardRef, useCallback, useLayoutEffect, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/utils";
import { PLACEHOLDER_RE } from "@/lib/rich-html";

const control = "w-full rounded-md border border-border bg-white/85 px-3 text-sm placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-slate-50 disabled:text-muted";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...p }, ref) {
  return <input ref={ref} className={cn(control, "h-9", className)} {...p} />;
});
/** Lớp nền tô vàng các chỗ [ghi rõ ...] nằm dưới ô nhập (chữ trong lớp này trong suốt nên chỉ thấy nền vàng). */
function PlaceholderBackdrop({ value, pad, scrollTop, innerRef }: { value: string; pad: string; scrollTop?: number; innerRef: React.RefObject<HTMLDivElement | null> }) {
  const parts: React.ReactNode[] = []; let last = 0; let k = 0;
  for (const m of value.matchAll(new RegExp(PLACEHOLDER_RE.source, "g"))) {
    if (m.index > last) parts.push(value.slice(last, m.index));
    parts.push(<mark key={k++} className="ph-mark">{m[0]}</mark>); last = m.index + m[0].length;
  }
  parts.push(value.slice(last));
  return <div ref={innerRef} aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words rounded-md border border-transparent text-sm text-transparent", pad)}>{parts}{"\n"}</div>;
}
export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement> & { highlightPlaceholders?: boolean }>(function Textarea({ className, highlightPlaceholders, onScroll, ...p }, ref) {
  const back = useRef<HTMLDivElement | null>(null);
  if (!highlightPlaceholders) return <textarea ref={ref} className={cn(control, "min-h-24 py-2", className)} {...p} />;
  const text = String(p.value ?? "");
  return (
    <div className="relative rounded-md bg-white/85">
      <PlaceholderBackdrop value={text} pad="px-3 py-2 leading-[1.25rem]" innerRef={back} />
      <textarea ref={ref} className={cn(control, "relative min-h-24 bg-transparent py-2 leading-[1.25rem]", className)} onScroll={(e) => { if (back.current) back.current.scrollTop = e.currentTarget.scrollTop; onScroll?.(e); }} {...p} />
    </div>
  );
});
/** Ô nhập một dòng nhưng chữ dài thì tự xuống dòng và cao dần (dùng cho tiêu đề). Enter không tạo dòng mới. */
export const WrapInput = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function WrapInput({ className, onInput, onKeyDown, ...p }, ref) {
  const inner = useRef<HTMLTextAreaElement | null>(null);
  const fit = useCallback(() => {
    const el = inner.current;
    if (el) { el.style.height = "auto"; el.style.height = `${el.scrollHeight + 2}px`; }
  }, []);
  useLayoutEffect(fit); // chạy sau mỗi lần render (giá trị đổi từ ngoài)
  return (
    <textarea
      ref={(el) => { inner.current = el; if (typeof ref === "function") ref(el); else if (ref) ref.current = el; }}
      rows={1}
      className={cn(control, "min-h-9 resize-none overflow-hidden py-[7px] leading-normal", className)}
      onInput={(e) => { fit(); onInput?.(e); }}
      onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); onKeyDown?.(e); }}
      {...p}
    />
  );
});
/** Ô nhập mật khẩu có nút con mắt để xem/ẩn mật khẩu. */
export const PasswordInput = forwardRef<HTMLInputElement, Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">>(function PasswordInput({ className, ...p }, ref) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input ref={ref} type={show ? "text" : "password"} className={cn(control, "h-9 pr-10", className)} {...p} />
      <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"} aria-pressed={show} tabIndex={-1}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-slate-500 hover:text-primary">
        {show ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
      </button>
    </div>
  );
});
export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...p }, ref) {
  return <select ref={ref} className={cn(control, "h-9 pr-8", className)} {...p}>{children}</select>;
});

export function Field({ label, error, hint, required, children, className, group, badge }: {
  label: string; /** Nhãn nhỏ cạnh tiêu đề trường (ví dụ "AI viết"). */ badge?: React.ReactNode; error?: string; hint?: string; required?: boolean; children: React.ReactNode; className?: string; /** Ô chứa nhiều nút/vùng soạn thảo: dùng <div> thay <label> để bấm vào không kích hoạt nhầm nút đầu tiên. */ group?: boolean;
}) {
  const Root = group ? "div" : "label";
  return (
    <Root className={cn("block", className)}>
      <span className="mb-1 flex min-h-8 flex-wrap items-center text-[13px] font-medium">{label}{required && <span className="text-danger">&nbsp;*</span>}{badge}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-muted">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </Root>
  );
}
