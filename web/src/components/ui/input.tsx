import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "flex h-11 w-full rounded-xl border border-input bg-card px-3.5 text-[15px] text-foreground transition-shadow placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  />
));
Input.displayName = "Input";

export function Label({ children, className, htmlFor }: { children: React.ReactNode; className?: string; htmlFor?: string }) {
  return <label htmlFor={htmlFor} className={cn("text-sm font-semibold text-foreground", className)}>{children}</label>;
}
