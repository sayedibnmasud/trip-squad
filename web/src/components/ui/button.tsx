import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

// shadcn/ui Button, tuned to Trip Squad: pill-shaped, with a springy press.
export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97] [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-[0_6px_16px_-6px_hsl(var(--primary)/0.7)] hover:-translate-y-0.5 hover:shadow-[0_10px_22px_-8px_hsl(var(--primary)/0.75)]",
        accent: "bg-accent text-accent-foreground shadow-[0_6px_16px_-6px_hsl(var(--accent)/0.9)] hover:-translate-y-0.5",
        outline: "border border-border bg-card text-foreground hover:border-foreground/40 hover:bg-secondary",
        ghost: "text-foreground hover:bg-secondary",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        link: "text-primary underline-offset-4 hover:underline"
      },
      size: {
        default: "h-11 px-5 text-[15px]",
        sm: "h-9 px-4 text-sm",
        lg: "h-12 px-7 text-base",
        icon: "h-10 w-10"
      }
    },
    defaultVariants: { variant: "default", size: "default" }
  }
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants> & { asChild?: boolean };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ asChild = false, className, size, variant, ...props }, ref) => {
  const Component = asChild ? Slot : "button";
  return <Component ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
});
Button.displayName = "Button";
