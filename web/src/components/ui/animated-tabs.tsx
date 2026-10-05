import * as TabsPrimitive from "@radix-ui/react-tabs";
import { motion } from "framer-motion";
import { useId } from "react";
import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

// Radix Tabs (keyboard + ARIA) with a Framer Motion pill that slides to the
// active tab.
export function AnimatedTabs<T extends string>({ items, onChange, value }: { items: { value: T; label: ReactNode }[]; onChange: (value: T) => void; value: T }) {
  const layoutId = useId();
  return (
    <TabsPrimitive.Root value={value} onValueChange={(next) => onChange(next as T)}>
      <TabsPrimitive.List className="mb-6 inline-flex max-w-full gap-1 overflow-x-auto rounded-full bg-secondary p-1">
        {items.map((item) => (
          <TabsPrimitive.Trigger
            key={item.value}
            value={item.value}
            className={cn(
              "relative whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              value === item.value ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {value === item.value ? (
              <motion.span layoutId={layoutId} className="absolute inset-0 rounded-full bg-card shadow-[0_4px_14px_-6px_hsl(166_37%_14%/0.35)]" transition={{ type: "spring", stiffness: 420, damping: 32 }} />
            ) : null}
            <span className="relative z-10">{item.label}</span>
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
    </TabsPrimitive.Root>
  );
}
