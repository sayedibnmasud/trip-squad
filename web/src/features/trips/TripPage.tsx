import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, MapPin, Navigation, Pencil, Trash2, Users } from "lucide-react";
import { lazy, Suspense, useState } from "react";
import { AnimatedTabs } from "../../components/ui/animated-tabs";
import { Button } from "../../components/ui/button";
import { Dialog } from "../../components/ui/dialog";
import { ConfirmDialog } from "../../shared/ui/ConfirmDialog";
import { useT } from "../../lib/i18n/LocalizationProvider";
import { Alert } from "../../shared/ui/Alert";
import { ExpensesTab } from "./ExpensesTab";
import { ItineraryTab } from "./ItineraryTab";
import { MembersTab, RoleBadge } from "./MembersTab";
import { formatRange, TripFormDialog } from "./MyTripsPage";
import { SuggestionsTab } from "./SuggestionsTab";
import { can, roleOf } from "./tripRoles";
import { deleteTrip, getTrip } from "./tripsApi";
import { useMe } from "./useMe";

// Leaflet is only fetched when a trip with a map is opened.
const TripMap = lazy(() => import("./TripMap").then((module) => ({ default: module.TripMap })));

const TABS = ["suggestions", "itinerary", "expenses", "members"] as const;
type Tab = (typeof TABS)[number];

export function TripPage({ onNavigate, tripId }: { onNavigate: (path: string) => void; tripId: string }) {
  const { language, t } = useT();
  const me = useMe();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("suggestions");
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const trip = useQuery({ queryKey: ["trip", tripId], queryFn: () => getTrip(tripId) });
  const remove = useMutation({
    mutationFn: () => deleteTrip(trip.data!),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["trips"] });
      onNavigate("/");
    }
  });

  if (trip.isLoading || !me) return <p className="muted">{t("common.loading")}</p>;
  if (trip.isError) return <Alert tone="error">{(trip.error as Error).message}</Alert>;
  if (!trip.data) return <Alert tone="error">{t("trip.notFound")}</Alert>;

  const data = trip.data;
  const role = roleOf(data, me.id);
  const point = typeof data.destinationLat === "number" && typeof data.destinationLng === "number"
    ? { lat: data.destinationLat, lng: data.destinationLng }
    : undefined;

  return (
    <section>
      <header className="trip-hero">
        <motion.div
          className={point ? "trip-hero-map" : "trip-hero-map no-map"}
          initial={{ opacity: 0, scale: 1.03 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          {point ? <Suspense fallback={null}><TripMap center={point} marker={point} zoom={data.address ? 14 : 9} interactive={false} /></Suspense> : null}
        </motion.div>
        <motion.div
          className="trip-hero-card"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 24, delay: 0.12 }}
        >
          <div className="min-w-0 flex-1">
            <div className="mb-2"><RoleBadge role={role} /></div>
            <h2>{data.name}</h2>
            <div className="trip-hero-meta">
              <span><MapPin size={16} /> {data.destination}</span>
              {data.address ? <span><Navigation size={16} /> {data.address}</span> : null}
              {data.startDate ? <span><CalendarDays size={16} /> {formatRange(data.startDate, data.endDate, language)}</span> : null}
              <span><Users size={16} /> {data.memberIds.length} {t("trips.members")}</span>
            </div>
          </div>
          {can(role, "editTrip") ? (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditing(true)}><Pencil size={16} /> {t("trip.edit")}</Button>
              <Button variant="ghost" size="icon" aria-label={t("trip.delete")} onClick={() => setDeleting(true)}><Trash2 size={18} /></Button>
            </div>
          ) : null}
        </motion.div>
      </header>

      <AnimatedTabs value={tab} onChange={setTab} items={TABS.map((name) => ({ value: name, label: t(`trip.tab.${name}`) }))} />

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={tab}
          role="tabpanel"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          {tab === "suggestions" ? <SuggestionsTab me={me} trip={data} /> : null}
          {tab === "itinerary" ? <ItineraryTab me={me} trip={data} /> : null}
          {tab === "expenses" ? <ExpensesTab me={me} trip={data} /> : null}
          {tab === "members" ? <MembersTab me={me} trip={data} /> : null}
        </motion.div>
      </AnimatePresence>

      <Dialog open={editing} onOpenChange={setEditing}>
        {editing ? <TripFormDialog trip={data} onClose={() => setEditing(false)} onSaved={() => undefined} /> : null}
      </Dialog>
      {deleting ? (
        <ConfirmDialog
          title={t("trip.delete")}
          message={`${data.name}: ${t("trip.deleteConfirm")}${remove.isError ? `\n\n${(remove.error as Error).message}` : ""}`}
          confirmLabel={t("trip.delete")}
          busy={remove.isPending}
          onCancel={() => setDeleting(false)}
          onConfirm={() => remove.mutate()}
        />
      ) : null}
    </section>
  );
}
