import { describe, expect, it } from "vitest";
import { computeBalances, settleUp } from "./balances";

const A = "user-a";
const B = "user-b";
const C = "user-c";

describe("computeBalances", () => {
  it("credits the payer and debits everyone in the split equally", () => {
    const balances = computeBalances([
      { amount: 2400, currency: "BDT", paidBy: A, splitBetween: [A, B, C] }
    ]);
    expect(balances.get("BDT")).toEqual(new Map([[A, 1600], [B, -800], [C, -800]]));
  });

  it("keeps currencies separate instead of mixing them", () => {
    const balances = computeBalances([
      { amount: 100, currency: "BDT", paidBy: A, splitBetween: [A, B] },
      { amount: 10, currency: "USD", paidBy: B, splitBetween: [A, B] }
    ]);
    expect(balances.get("BDT")).toEqual(new Map([[A, 50], [B, -50]]));
    expect(balances.get("USD")).toEqual(new Map([[B, 5], [A, -5]]));
  });

  it("puts the rounding remainder on the payer so each currency nets to zero", () => {
    const balances = computeBalances([
      { amount: 100, currency: "BDT", paidBy: A, splitBetween: [A, B, C] }
    ]).get("BDT")!;
    const total = [...balances.values()].reduce((sum, value) => sum + value, 0);
    expect(total).toBeCloseTo(0, 10);
    expect(balances.get(B)).toBe(-33.33);
    expect(balances.get(C)).toBe(-33.33);
    expect(balances.get(A)).toBe(66.66);
  });

  it("ignores expenses with no one to split between or a non-positive amount", () => {
    const balances = computeBalances([
      { amount: 500, currency: "BDT", paidBy: A, splitBetween: [] },
      { amount: 0, currency: "BDT", paidBy: A, splitBetween: [A, B] }
    ]);
    expect(balances.size).toBe(0);
  });
});

describe("settleUp", () => {
  it("produces the transfers that clear every balance", () => {
    const transfers = settleUp(new Map([[A, 1600], [B, -800], [C, -800]]));
    expect(transfers).toEqual([
      { from: B, to: A, amount: 800 },
      { from: C, to: A, amount: 800 }
    ]);
  });

  it("matches the largest debtor with the largest creditor first", () => {
    const transfers = settleUp(new Map([[A, 300], [B, 100], [C, -400]]));
    expect(transfers).toEqual([
      { from: C, to: A, amount: 300 },
      { from: C, to: B, amount: 100 }
    ]);
  });

  it("returns nothing when everyone is square", () => {
    expect(settleUp(new Map([[A, 0], [B, 0]]))).toEqual([]);
  });
});
