import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Wand2 } from "lucide-react";
import { useState } from "react";
import { useT } from "../../lib/i18n/LocalizationProvider";
import { ActionButton } from "../../shared/ui/ActionButton";
import { Alert } from "../../shared/ui/Alert";
import { arrangeItinerary, tripDays } from "./itinerary";
import { listItinerary, saveItineraryDay } from "./tripsApi";
import type { ItineraryDay, Trip } from "./tripsApi";
import { useScoredSuggestions } from "./SuggestionsTab";

export function ItineraryTab({ me, trip }: { me: { id: string }; trip: Trip }) {
  const { language, t } = useT();
  const queryClient = useQueryClient();
  const saved = useQuery({ queryKey: ["itinerary", trip.ItemId], queryFn: () => listItinerary(trip.ItemId) });
  const { rows } = useScoredSuggestions(trip, me.id);
  const [editing, setEditing] = useState<string | undefined>();
  const [notice, setNotice] = useState<string | undefined>();

  const days = trip.startDate ? tripDays(trip.startDate, trip.endDate) : [];
  const byDate = new Map((saved.data ?? []).map((day) => [day.date.slice(0, 10), day]));
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["itinerary", trip.ItemId] });

  // Rule-based draft for now: the AI generator in the plan replaces
  // arrangeItinerary() once a Blocks AI agent is configured for the project.
  const arrange = useMutation({
    mutationFn: async () => {
      const plan = arrangeItinerary(days, rows.map((row) => ({ title: row.title, type: row.type, score: row.score })));
      if (plan.every((day) => day.items.length === 0)) return false;
      for (const day of plan) {
        await saveItineraryDay(trip, `${day.date}T00:00:00.000Z`, day.items, byDate.get(day.date));
      }
      return true;
    },
    onSuccess: (arranged) => setNotice(arranged ? undefined : t("itinerary.noVotes")),
    onSettled: invalidate
  });

  return (
    <div>
      <div className="panel arrange-panel">
        <div>
          <strong>{t("itinerary.arrange")}</strong>
          <p>{t("itinerary.arrangeHint")}</p>
        </div>
        <ActionButton icon={<Wand2 size={16} />} disabled={arrange.isPending || days.length === 0} onClick={() => arrange.mutate()}>
          {t("itinerary.arrangeAction")}
        </ActionButton>
      </div>

      {notice ? <Alert tone="info">{notice}</Alert> : null}
      {[saved.error, arrange.error].filter(Boolean).map((err, index) => <Alert key={index} tone="error">{(err as Error).message}</Alert>)}
      {saved.isSuccess && saved.data.length === 0 ? <p className="muted">{t("itinerary.empty")}</p> : null}

      <ol className="item-list">
        {days.map((date, index) => (
          <li key={date} className="panel day-card">
            <div className="day-head">
              <span className="day-number">{t("itinerary.day")} {index + 1}</span>
              <span className="day-date">{new Date(`${date}T00:00:00Z`).toLocaleDateString(language, { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" })}</span>
              {editing === date ? null : (
                <button className="icon-button day-edit" aria-label={t("itinerary.edit")} onClick={() => setEditing(date)}><Pencil size={14} /></button>
              )}
            </div>
            {editing === date ? (
              <DayEditor
                existing={byDate.get(date)}
                onCancel={() => setEditing(undefined)}
                onSave={async (items) => {
                  await saveItineraryDay(trip, `${date}T00:00:00.000Z`, items, byDate.get(date));
                  await invalidate();
                  setEditing(undefined);
                }}
              />
            ) : byDate.get(date)?.items?.length ? (
              <ul className="plan-items">{byDate.get(date)!.items.map((item, itemIndex) => <li key={itemIndex}>{item}</li>)}</ul>
            ) : (
              <p className="muted">{t("itinerary.nothing")}</p>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

function DayEditor({ existing, onCancel, onSave }: { existing?: ItineraryDay; onCancel: () => void; onSave: (items: string[]) => Promise<void> }) {
  const { t } = useT();
  const [text, setText] = useState((existing?.items ?? []).join("\n"));
  const save = useMutation({ mutationFn: () => onSave(text.split("\n").map((line) => line.trim()).filter(Boolean)) });

  return (
    <div className="form-grid">
      <textarea className="plan-editor" rows={5} placeholder={t("itinerary.placeholder")} value={text} onChange={(event) => setText(event.target.value)} />
      {save.isError ? <Alert tone="error">{(save.error as Error).message}</Alert> : null}
      <div className="form-actions">
        <button type="button" className="icon-button" onClick={onCancel}>{t("common.cancel")}</button>
        <ActionButton disabled={save.isPending} onClick={() => save.mutate()}>{t("common.save")}</ActionButton>
      </div>
    </div>
  );
}
