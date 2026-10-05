import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

// shadcn/ui Dialog: Radix handles focus trapping, Escape and scroll lock;
// tailwindcss-animate gives the zoom/fade in and out.
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;

export function DialogContent({ children, className, title, description }: { children: ReactNode; className?: string; title: string; description?: string }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-[80] bg-[hsl(166_37%_8%/0.5)] backdrop-blur-[3px] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
      <DialogPrimitive.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-[81] grid max-h-[calc(100vh-32px)] w-[calc(100vw-24px)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-5 overflow-y-auto rounded-3xl bg-card p-6 shadow-[0_30px_80px_-20px_hsl(166_37%_8%/0.55)] duration-200 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-bottom-4 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          className
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="grid gap-1">
            <DialogPrimitive.Title className="font-display text-2xl font-extrabold tracking-tight">{title}</DialogPrimitive.Title>
            {description ? <DialogPrimitive.Description className="text-sm text-muted-foreground">{description}</DialogPrimitive.Description> : <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>}
          </div>
          <DialogPrimitive.Close className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition hover:rotate-90 hover:bg-secondary hover:text-foreground" aria-label="Close">
            <X size={18} />
          </DialogPrimitive.Close>
        </div>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
