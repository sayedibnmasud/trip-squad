import { format } from "date-fns";
import { CalendarDays } from "lucide-react";
import { useState } from "react";
import { DayPicker } from "react-day-picker";
import type { DateRange } from "react-day-picker";
import "react-day-picker/style.css";
import { cn } from "../../lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

// Dates travel through the app as YYYY-MM-DD strings (UTC calendar days).
export type DayRange = { from?: string; to?: string };

const toDate = (value?: string) => (value ? new Date(`${value}T00:00:00`) : undefined);
const toDay = (date?: Date) => (date ? format(date, "yyyy-MM-dd") : undefined);

export function DateRangePicker({ onChange, placeholder, value }: { onChange: (range: DayRange) => void; placeholder: string; value: DayRange }) {
  const [open, setOpen] = useState(false);
  const from = toDate(value.from);
  const to = toDate(value.to);
  const label = from ? (to && value.to !== value.from ? `${format(from, "d MMM yyyy")} – ${format(to, "d MMM yyyy")}` : format(from, "d MMM yyyy")) : placeholder;
  const twoMonths = typeof window !== "undefined" && window.matchMedia("(min-width: 720px)").matches;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-11 w-full items-center gap-2.5 rounded-xl border border-input bg-card px-3.5 text-left text-[15px] transition-shadow hover:border-foreground/30 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15",
            !from && "text-muted-foreground"
          )}
        >
          <CalendarDays size={18} className="text-primary" />
          <span className="truncate">{label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3">
        <DayPicker
          className="trip-calendar"
          mode="range"
          numberOfMonths={twoMonths ? 2 : 1}
          defaultMonth={from ?? new Date()}
          disabled={{ before: new Date() }}
          selected={{ from, to } as DateRange}
          onSelect={(range) => {
            onChange({ from: toDay(range?.from), to: toDay(range?.to) });
            if (range?.from && range?.to && range.to.getTime() !== range.from.getTime()) setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
