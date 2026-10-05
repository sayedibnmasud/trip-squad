import { Command } from "cmdk";
import { Loader2, MapPin, Search } from "lucide-react";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "../../lib/utils";
import { Popover, PopoverAnchor, PopoverContent } from "./popover";

// Free-text autocomplete over a remote search (cmdk for keyboard navigation
// and ARIA, a Radix Popover for placement). Results come from `search`, which
// is debounced here and cancelled when the text changes.
export type Suggestion = { id: string; title: string; subtitle?: string };

const DELAY_MS = 450;

export function PlaceAutocomplete<T extends Suggestion>({
  freeTextLabel,
  icon,
  minLength = 3,
  noResults,
  onPick,
  onTextChange,
  placeholder,
  search,
  text
}: {
  freeTextLabel?: (text: string) => ReactNode;
  icon?: ReactNode;
  minLength?: number;
  noResults: string;
  onPick: (item: T | { id: "typed"; title: string }) => void;
  onTextChange: (text: string) => void;
  placeholder: string;
  search: (text: string, signal: AbortSignal) => Promise<T[]>;
  text: string;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<T[]>([]);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    const term = text.trim();
    if (!open || term.length < minLength) {
      setItems([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setBusy(true);
      setError(undefined);
      search(term, controller.signal)
        .then(setItems)
        .catch((caught: Error) => { if (caught.name !== "AbortError") setError(caught.message); })
        .finally(() => setBusy(false));
    }, DELAY_MS);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [text, open, minLength, search]);

  const term = text.trim();
  const showList = open && term.length >= minLength;

  function pick(item: T | { id: "typed"; title: string }) {
    onPick(item);
    setOpen(false);
  }

  return (
    <Command shouldFilter={false} loop className="relative">
      <Popover open={showList} onOpenChange={setOpen}>
        <PopoverAnchor asChild>
          <div className="flex h-11 items-center gap-2.5 rounded-xl border border-input bg-card px-3.5 transition-shadow focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15">
            {busy ? <Loader2 size={18} className="animate-spin text-primary" /> : icon ?? <Search size={18} className="text-muted-foreground" />}
            <Command.Input
              value={text}
              onValueChange={(next) => { onTextChange(next); setOpen(true); }}
              onFocus={() => setOpen(true)}
              onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }}
              placeholder={placeholder}
              className="h-full w-full bg-transparent text-[15px] outline-none placeholder:text-muted-foreground focus-visible:outline-none"
            />
          </div>
        </PopoverAnchor>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] min-w-[280px] p-1.5"
          onOpenAutoFocus={(event) => event.preventDefault()}
          onInteractOutside={(event) => { if ((event.target as HTMLElement).closest("[cmdk-input]")) event.preventDefault(); }}
        >
          <Command.List className="max-h-72 overflow-y-auto">
            {error ? <div className="px-3 py-2 text-sm text-destructive">{error}</div> : null}
            {!busy && items.length === 0 && !error ? <div className="px-3 py-2 text-sm text-muted-foreground">{noResults}</div> : null}
            {items.map((item) => (
              <Command.Item key={item.id} value={item.id} onSelect={() => pick(item)} className={itemClass}>
                <MapPin size={18} className="mt-0.5 shrink-0 text-primary" />
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{item.title}</span>
                  {item.subtitle ? <span className="block truncate text-xs text-muted-foreground">{item.subtitle}</span> : null}
                </span>
              </Command.Item>
            ))}
            {freeTextLabel ? (
              <Command.Item value="__typed" onSelect={() => pick({ id: "typed", title: term })} className={itemClass}>
                <Search size={18} className="mt-0.5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 text-sm">{freeTextLabel(term)}</span>
              </Command.Item>
            ) : null}
          </Command.List>
        </PopoverContent>
      </Popover>
    </Command>
  );
}

const itemClass = cn("flex cursor-pointer items-start gap-2.5 rounded-xl px-3 py-2.5 text-[15px] outline-none data-[selected=true]:bg-secondary");
