import * as PopoverPrimitive from "@radix-ui/react-popover";
import { forwardRef } from "react";
import type { ComponentPropsWithoutRef, ElementRef } from "react";
import { cn } from "../../lib/utils";

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverAnchor = PopoverPrimitive.Anchor;

export const PopoverContent = forwardRef<ElementRef<typeof PopoverPrimitive.Content>, ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>>(
  ({ align = "start", className, sideOffset = 6, ...props }, ref) => (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={ref}
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-[90] rounded-2xl border border-border bg-popover p-1.5 text-foreground shadow-[0_18px_40px_-14px_hsl(166_37%_8%/0.35)] outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-top-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          className
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  )
);
PopoverContent.displayName = "PopoverContent";
