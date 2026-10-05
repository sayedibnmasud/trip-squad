import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import { useT } from "../../lib/i18n/LocalizationProvider";
import { ActionButton } from "../../shared/ui/ActionButton";
import { Alert } from "../../shared/ui/Alert";
import { FormField } from "../../shared/ui/FormField";
import { computeBalances, settleUp } from "./balances";
import { ReadOnlyNote } from "./SuggestionsTab";
import { can, canChange, roleOf } from "./tripRoles";
import { addExpense, deleteExpense, listExpenses, memberName } from "./tripsApi";
import type { Trip } from "./tripsApi";

export function ExpensesTab({ me, trip }: { me: { id: string }; trip: Trip }) {
  const role = roleOf(trip, me.id);
  const { t } = useT();
  const queryClient = useQueryClient();
  const expenses = useQuery({ queryKey: ["expenses", trip.ItemId], queryFn: () => listExpenses(trip.ItemId) });
  const [form, setForm] = useState({ description: "", amount: "", currency: "BDT", paidBy: me.id, splitBetween: trip.memberIds });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["expenses", trip.ItemId] });

  const add = useMutation({
    mutationFn: () => addExpense(trip, {
      description: form.description.trim(),
      amount: Number(form.amount),
      currency: form.currency.trim().toUpperCase(),
      paidBy: form.paidBy,
      splitBetween: form.splitBetween
    }),
    onSuccess: async () => {
      setForm({ ...form, description: "", amount: "" });
      await invalidate();
    }
  });
  const remove = useMutation({ mutationFn: (expenseId: string) => deleteExpense(expenseId), onSettled: invalidate });

  // Balances are derived on read from the expense list rather than stored, so
  // they can never drift out of sync with the expenses themselves.
  const balances = computeBalances(expenses.data ?? []);
  const amount = Number(form.amount);
  const valid = form.description.trim() && amount > 0 && /^[A-Za-z]{3}$/.test(form.currency.trim()) && form.splitBetween.length > 0;

  function toggleSplit(userId: string) {
    const splitBetween = form.splitBetween.includes(userId)
      ? form.splitBetween.filter((id) => id !== userId)
      : [...form.splitBetween, userId];
    setForm({ ...form, splitBetween });
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (valid) add.mutate();
  }

  return (
    <div className="expense-layout">
      <div>
        {can(role, "contribute") ? <form className="panel form-grid" onSubmit={submit}>
          <FormField label={t("expense.description")} required value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          <FormField label={t("expense.amount")} required type="number" min="0.01" step="0.01" inputMode="decimal" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} />
          <FormField label={t("expense.currency")} required maxLength={3} value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value })} />
          <label className="form-field">
            <span>{t("expense.paidBy")}</span>
            <select value={form.paidBy} onChange={(event) => setForm({ ...form, paidBy: event.target.value })}>
              {trip.memberIds.map((id) => <option key={id} value={id}>{memberName(trip, id)}</option>)}
            </select>
          </label>
          <fieldset className="split-picker">
            <legend>{t("expense.split")}</legend>
            {trip.memberIds.map((id) => (
              <label key={id} className="chip">
                <input type="checkbox" checked={form.splitBetween.includes(id)} onChange={() => toggleSplit(id)} /> {memberName(trip, id)}
              </label>
            ))}
          </fieldset>
          <div className="form-actions">
            <ActionButton type="submit" disabled={!valid || add.isPending}>{t("expense.add")}</ActionButton>
          </div>
        </form> : <ReadOnlyNote />}

        {[expenses.error, add.error, remove.error].filter(Boolean).map((err, index) => <Alert key={index} tone="error">{(err as Error).message}</Alert>)}

        {expenses.data?.length === 0 ? <p className="muted">{t("expense.empty")}</p> : (
          <ul className="item-list">
            {(expenses.data ?? []).map((expense) => (
              <li key={expense.ItemId} className="panel expense-row">
                <div>
                  <strong>{expense.description}</strong>
                  <span className="muted">{memberName(trip, expense.paidBy)} {t("expense.paid")}, {t("expense.splitWith")} {expense.splitBetween.map((id) => memberName(trip, id)).join(", ")}</span>
                </div>
                <span className="expense-amount">{formatMoney(expense.amount, expense.currency)}</span>
                {canChange(role, expense, me.id) ? <button className="icon-button" aria-label={t("common.delete")} disabled={remove.isPending} onClick={() => remove.mutate(expense.ItemId)}><Trash2 size={16} /></button> : <span />}
              </li>
            ))}
          </ul>
        )}
      </div>

      <aside className="panel balance-card" aria-live="polite">
        <div className="panel-title"><span>{t("expense.balances")}</span></div>
        {balances.size === 0 ? <p className="muted">{t("expense.settled")}</p> : [...balances].map(([currency, ledger]) => {
          const transfers = settleUp(ledger);
          return transfers.length === 0 ? <p key={currency} className="muted">{currency}: {t("expense.settled")}</p> : (
            <div key={currency}>
              {transfers.map((transfer) => (
                <div key={`${transfer.from}-${transfer.to}`} className="settle-row">
                  <span className="settle-who">
                    <strong>{memberName(trip, transfer.from)}</strong>
                    <span className="muted">{t("expense.paysTo").replace("{name}", memberName(trip, transfer.to))}</span>
                  </span>
                  <span className="settle-amount">{formatMoney(transfer.amount, currency)}</span>
                </div>
              ))}
            </div>
          );
        })}
      </aside>
    </div>
  );
}

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { currency, style: "currency" }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}
