export type ExpenseShare = {
  amount: number;
  currency: string;
  paidBy: string;
  splitBetween: string[];
};

export type Transfer = { from: string; to: string; amount: number };

// Net balance per user, per currency: positive means the group owes them.
// Work in integer cents so repeated splits never drift; amounts in different
// currencies are never added together.
export function computeBalances(expenses: ExpenseShare[]): Map<string, Map<string, number>> {
  const cents = new Map<string, Map<string, number>>();

  for (const expense of expenses) {
    const people = [...new Set(expense.splitBetween)];
    const total = Math.round(expense.amount * 100);
    if (people.length === 0 || total <= 0) continue;

    const ledger = cents.get(expense.currency) ?? new Map<string, number>();
    cents.set(expense.currency, ledger);

    const base = Math.floor(total / people.length);
    const remainder = total - base * people.length;
    // The leftover cent(s) land on the payer when they share the cost, so the
    // people they paid for are never charged more than an even split.
    const remainderHolder = people.includes(expense.paidBy) ? expense.paidBy : people[0];

    ledger.set(expense.paidBy, (ledger.get(expense.paidBy) ?? 0) + total);
    for (const person of people) {
      const share = base + (person === remainderHolder ? remainder : 0);
      ledger.set(person, (ledger.get(person) ?? 0) - share);
    }
  }

  const result = new Map<string, Map<string, number>>();
  for (const [currency, ledger] of cents) {
    result.set(currency, new Map([...ledger].map(([person, value]) => [person, value / 100])));
  }
  return result;
}

// Greedy settle-up for one currency: repeatedly match the biggest debtor with
// the biggest creditor. Produces at most (people - 1) transfers.
export function settleUp(balances: Map<string, number>): Transfer[] {
  const creditors = [...balances].filter(([, value]) => value > 0).map(([id, value]) => ({ id, cents: Math.round(value * 100) }));
  const debtors = [...balances].filter(([, value]) => value < 0).map(([id, value]) => ({ id, cents: Math.round(-value * 100) }));
  const transfers: Transfer[] = [];

  for (;;) {
    creditors.sort((a, b) => b.cents - a.cents);
    debtors.sort((a, b) => b.cents - a.cents);
    const creditor = creditors[0];
    const debtor = debtors[0];
    if (!creditor || !debtor) break;
    const amount = Math.min(creditor.cents, debtor.cents);

    transfers.push({ from: debtor.id, to: creditor.id, amount: amount / 100 });
    creditor.cents -= amount;
    debtor.cents -= amount;
    if (creditor.cents === 0) creditors.shift();
    if (debtor.cents === 0) debtors.shift();
  }

  return transfers;
}
