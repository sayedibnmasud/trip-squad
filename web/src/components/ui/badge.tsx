import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export const badgeVariants = cva("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold", {
  variants: {
    tone: {
      place: "bg-sky/25 text-[hsl(199_70%_28%)]",
      food: "bg-accent/30 text-[hsl(30_75%_28%)]",
      activity: "bg-lilac/25 text-[hsl(256_45%_38%)]",
      neutral: "bg-secondary text-muted-foreground"
    }
  },
  defaultVariants: { tone: "neutral" }
});

export function Badge({ className, tone, ...props }: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
