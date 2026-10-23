import { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-white hover:bg-primary-dark disabled:bg-primary/50",
  secondary: "border border-border bg-white/85 text-foreground hover:bg-slate-50 disabled:opacity-50",
  ghost: "text-foreground hover:bg-slate-100 disabled:opacity-50",
  danger: "bg-danger text-white hover:bg-red-800 disabled:opacity-50",
};
const sizes: Record<Size, string> = { sm: "h-8 px-3 text-[13px]", md: "h-9 px-4 text-sm" };

export const buttonClass = (variant: Variant = "primary", size: Size = "md", extra?: string) =>
  cn("inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md font-medium transition-colors disabled:cursor-not-allowed", variants[variant], sizes[size], extra);

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean };

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "primary", size = "md", loading, disabled, className, children, type = "button", ...rest }, ref,
) {
  return (
    <button ref={ref} type={type} disabled={disabled || loading} className={buttonClass(variant, size, className)} {...rest}>
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
});
