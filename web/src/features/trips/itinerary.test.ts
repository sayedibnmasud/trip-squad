import { describe, expect, it } from "vitest";
import { arrangeItinerary, tripDays } from "./itinerary";

describe("tripDays", () => {
  it("lists every calendar day from start to end inclusive", () => {
    expect(tripDays("2026-11-01T00:00:00.000Z", "2026-11-03T00:00:00.000Z")).toEqual(["2026-11-01", "2026-11-02", "2026-11-03"]);
  });

  it("falls back to a single day when the end is missing or before the start", () => {
    expect(tripDays("2026-11-05T00:00:00.000Z", undefined)).toEqual(["2026-11-05"]);
    expect(tripDays("2026-11-05T00:00:00.000Z", "2026-11-01T00:00:00.000Z")).toEqual(["2026-11-05"]);
  });

  it("caps very long trips at 30 days", () => {
    expect(tripDays("2026-01-01T00:00:00.000Z", "2026-12-31T00:00:00.000Z")).toHaveLength(30);
  });
});

describe("arrangeItinerary", () => {
  const days = ["2026-11-01", "2026-11-02"];

  it("drops suggestions the group voted down or ignored", () => {
    const plan = arrangeItinerary(days, [
      { title: "Boat ride", type: "activity", score: 2 },
      { title: "Tourist trap", type: "place", score: -1 },
      { title: "Unvoted cafe", type: "food", score: 0 }
    ]);
    expect(plan.flatMap((day) => day.items)).toEqual(["Boat ride"]);
  });

  it("spreads the top picks across days instead of stacking day one", () => {
    const plan = arrangeItinerary(days, [
      { title: "A", type: "place", score: 5 },
      { title: "B", type: "place", score: 4 },
      { title: "C", type: "place", score: 3 },
      { title: "D", type: "place", score: 2 }
    ]);
    expect(plan).toEqual([
      { date: "2026-11-01", items: ["A", "C"] },
      { date: "2026-11-02", items: ["B", "D"] }
    ]);
  });

  it("orders each day as sights and activities first, food after", () => {
    const plan = arrangeItinerary(["2026-11-01"], [
      { title: "Lunch spot", type: "food", score: 9 },
      { title: "Fort", type: "place", score: 3 },
      { title: "Kayak", type: "activity", score: 2 }
    ]);
    expect(plan[0]?.items).toEqual(["Fort", "Kayak", "Lunch spot"]);
  });
});
