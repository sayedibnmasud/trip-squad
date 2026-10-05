import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { MapPin, Plus, Sparkles, ThumbsDown, ThumbsUp, Trash2, UtensilsCrossed } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import { useT } from "../../lib/i18n/LocalizationProvider";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { cn } from "../../lib/utils";
import { Alert } from "../../shared/ui/Alert";
import { can, canChange, roleOf } from "./tripRoles";
import { addSuggestion, castVote, deleteSuggestion, listSuggestions, listVotes, memberName } from "./tripsApi";
import type { Suggestion, SuggestionType, Trip, Vote } from "./tripsApi";

const TYPES: SuggestionType[] = ["place", "food", "activity"];
const TYPE_ICONS = { place: MapPin, food: UtensilsCrossed, activity: Sparkles } as const;

export type ScoredRow = Suggestion & { score: number; myVote?: Vote };

export function useScoredSuggestions(trip: Trip, myId: string | undefined) {
  const suggestions = useQuery({ queryKey: ["suggestions", trip.ItemId], queryFn: () => listSuggestions(trip.ItemId) });
  const votes = useQuery({ queryKey: ["votes", trip.ItemId], queryFn: () => listVotes(trip.ItemId) });

  const rows: ScoredRow[] = (suggestions.data ?? []).map((suggestion) => {
    const mine = (votes.data ?? []).filter((vote) => vote.suggestionId === suggestion.ItemId);
    return {
      ...suggestion,
      score: mine.reduce((sum, vote) => sum + (vote.value > 0 ? 1 : -1), 0),
      myVote: mine.find((vote) => vote.CreatedBy === myId)
    };
  }).sort((a, b) => b.score - a.score);

  return { error: suggestions.error ?? votes.error, isLoading: suggestions.isLoading || votes.isLoading, rows };
}

export function SuggestionsTab({ me, trip }: { me: { id: string; name: string }; trip: Trip }) {
  const role = roleOf(trip, me.id);
  const canContribute = can(role, "contribute");
  const { t } = useT();
  const queryClient = useQueryClient();
  const { error, isLoading, rows } = useScoredSuggestions(trip, me.id);
  const [form, setForm] = useState<{ title: string; type: SuggestionType; notes: string }>({ title: "", type: "place", notes: "" });

  const invalidate = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ["suggestions", trip.ItemId] }),
    queryClient.invalidateQueries({ queryKey: ["votes", trip.ItemId] })
  ]);

  const add = useMutation({
    mutationFn: () => addSuggestion(trip, { ...form, title: form.title.trim(), notes: form.notes.trim() }),
    onSuccess: async () => {
      setForm({ title: "", type: form.type, notes: "" });
      await invalidate();
    }
  });
  const vote = useMutation({
    mutationFn: ({ row, value }: { row: ScoredRow; value: 1 | -1 }) => castVote(trip, row.ItemId, value, row.myVote),
    onSettled: invalidate
  });
  const remove = useMutation({ mutationFn: (row: ScoredRow) => deleteSuggestion(row.ItemId), onSettled: invalidate });

  function submit(event: FormEvent) {
    event.preventDefault();
    if (form.title.trim()) add.mutate();
  }

  return (
    <div>
      {canContribute ? <form className="panel grid gap-3 p-4" onSubmit={submit}>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input aria-label={t("suggest.title")} placeholder={t("suggest.placeholder")} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          <Button type="submit" disabled={!form.title.trim() || add.isPending}><Plus size={18} /> {t("suggest.add")}</Button>
        </div>
        <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label={t("suggest.type")}>
          {TYPES.map((type) => {
            const Icon = TYPE_ICONS[type];
            const active = form.type === type;
            return (
              <motion.button
                key={type}
                type="button"
                role="radio"
                aria-checked={active}
                whileTap={{ scale: 0.92 }}
                onClick={() => setForm({ ...form, type })}
                className={cn("inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition-colors", active ? "border-foreground bg-foreground text-background" : "border-border bg-card text-muted-foreground hover:text-foreground")}
              >
                <Icon size={15} /> {t(`suggest.type.${type}`)}
              </motion.button>
            );
          })}
          <AnimatePresence>
            {form.title.trim() ? (
              <motion.div className="w-full" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                <Input className="mt-1" aria-label={t("suggest.notes")} placeholder={t("suggest.notes")} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </form> : <ReadOnlyNote />}

      {[error, add.error, vote.error, remove.error].filter(Boolean).map((err, index) => <Alert key={index} tone="error">{(err as Error).message}</Alert>)}

      {isLoading ? <p className="muted">{t("common.loading")}</p> : rows.length === 0 ? <p className="muted">{t("suggest.empty")}</p> : (
        <ul className="item-list">
          <AnimatePresence initial={false}>
            {rows.map((row, index) => {
              const Icon = TYPE_ICONS[row.type] ?? MapPin;
              return (
                // `layout` slides rows into their new rank when votes change.
                <motion.li
                  key={row.ItemId}
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  className={cn("panel suggestion-row", index === 0 && row.score > 0 && "top-pick")}
                >
                  <div className="vote-box">
                    <motion.button whileTap={{ scale: 0.8, rotate: -12 }} className={`icon-button ${row.myVote?.value === 1 ? "voted" : ""}`} aria-label={t("suggest.upvote")} aria-pressed={row.myVote?.value === 1} disabled={vote.isPending || !canContribute} onClick={() => vote.mutate({ row, value: 1 })}>
                      <ThumbsUp size={16} />
                    </motion.button>
                    <AnimatePresence mode="popLayout" initial={false}>
                      <motion.strong key={row.score} initial={{ y: -10, opacity: 0, scale: 0.6 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 10, opacity: 0 }} transition={{ type: "spring", stiffness: 500, damping: 22 }}>
                        {row.score}
                      </motion.strong>
                    </AnimatePresence>
                    <motion.button whileTap={{ scale: 0.8, rotate: 12 }} className={`icon-button ${row.myVote?.value === -1 ? "voted" : ""}`} aria-label={t("suggest.downvote")} aria-pressed={row.myVote?.value === -1} disabled={vote.isPending || !canContribute} onClick={() => vote.mutate({ row, value: -1 })}>
                      <ThumbsDown size={16} />
                    </motion.button>
                  </div>
                  <div className="suggestion-body">
                    <strong>{row.title}</strong>
                    <span className="muted">
                      <Badge tone={row.type}><Icon size={12} /> {t(`suggest.type.${row.type}`)}</Badge>
                      {row.CreatedBy ? ` ${t("suggest.by")} ${memberName(trip, row.CreatedBy)}` : null}
                      {index === 0 && row.score > 0 ? <Badge tone="food" className="ml-1">{t("suggest.topPick")}</Badge> : null}
                    </span>
                    {row.notes ? <p>{row.notes}</p> : null}
                  </div>
                  {canChange(role, row, me.id) ? (
                    <button className="icon-button" aria-label={t("common.delete")} disabled={remove.isPending} onClick={() => remove.mutate(row)}>
                      <Trash2 size={16} />
                    </button>
                  ) : null}
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}

export function ReadOnlyNote() {
  const { t } = useT();
  return <p className="panel text-sm text-muted-foreground">{t("tripRole.viewer.note")}</p>;
}
