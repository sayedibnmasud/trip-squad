export type ScoredSuggestion = { title: string; type: string; score: number };
export type PlannedDay = { date: string; items: string[] };

const MAX_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
const TYPE_ORDER: Record<string, number> = { place: 0, activity: 1, food: 2 };

// Calendar days (YYYY-MM-DD, UTC) covered by the trip, inclusive.
export function tripDays(startDate: string, endDate: string | undefined): string[] {
  const start = Date.parse(startDate.slice(0, 10));
  const end = endDate ? Date.parse(endDate.slice(0, 10)) : start;
  const count = Number.isNaN(end) || end < start ? 1 : Math.min(Math.round((end - start) / DAY_MS) + 1, MAX_DAYS);
  return Array.from({ length: count }, (_, index) => new Date(start + index * DAY_MS).toISOString().slice(0, 10));
}

// Draft plan from the group's votes: keep only net-positive suggestions, deal
// them round-robin by score so every day gets a top pick, then order each day
// sights -> activities -> food. The group edits the result afterwards.
export function arrangeItinerary(days: string[], suggestions: ScoredSuggestion[]): PlannedDay[] {
  const picks = suggestions.filter((item) => item.score > 0).sort((a, b) => b.score - a.score);
  const buckets: ScoredSuggestion[][] = days.map(() => []);
  picks.forEach((item, index) => buckets[index % days.length]?.push(item));

  return days.map((date, index) => ({
    date,
    items: (buckets[index] ?? [])
      .slice()
      .sort((a, b) => (TYPE_ORDER[a.type] ?? 1) - (TYPE_ORDER[b.type] ?? 1))
      .map((item) => item.title)
  }));
}
