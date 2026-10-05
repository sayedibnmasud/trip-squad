import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import confetti from "canvas-confetti";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Luggage, MapPin, Plus, Users } from "lucide-react";
import { lazy, Suspense, useState } from "react";
import type { FormEvent, PointerEvent } from "react";
import { Button } from "../../components/ui/button";
import { DateRangePicker } from "../../components/ui/date-range-picker";
import type { DayRange } from "../../components/ui/date-range-picker";
import { Dialog, DialogContent } from "../../components/ui/dialog";
import { Input, Label } from "../../components/ui/input";
import { useT } from "../../lib/i18n/LocalizationProvider";
import { Alert } from "../../shared/ui/Alert";
import { EmptyState } from "../../shared/ui/EmptyState";
import { PageHeader } from "../../shared/ui/PageHeader";
import { Skeleton } from "../../shared/ui/Skeleton";
import type { Destination } from "./DestinationPicker";
import { placeAt } from "./geocoding";
import type { Place } from "./geocoding";
import { tripDays } from "./itinerary";
import type { LatLng } from "./TripMap";
import { alignedNames, createTrip, listMyTrips, updateTripDetails } from "./tripsApi";
import type { Trip } from "./tripsApi";
import { useMe } from "./useMe";

// The map picker (and Leaflet with it) loads when the dialog opens.
const DestinationPicker = lazy(() => import("./DestinationPicker").then((module) => ({ default: module.DestinationPicker })));
const AddressField = lazy(() => import("./DestinationPicker").then((module) => ({ default: module.AddressField })));

const list = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 24, rotate: -1.5 }, show: { opacity: 1, y: 0, rotate: 0, transition: { type: "spring", stiffness: 260, damping: 22 } } };

export function MyTripsPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { t } = useT();
  const [creating, setCreating] = useState(false);
  const trips = useQuery({ queryKey: ["trips"], queryFn: listMyTrips });
  // Soonest trip first; undated trips last.
  const sorted = [...(trips.data ?? [])].sort((a, b) => (a.startDate ?? "9999").localeCompare(b.startDate ?? "9999"));

  return (
    <section>
      <PageHeader
        title={t("trips.title")}
        subtitle={t("trips.subtitle")}
        actions={<Button size="lg" onClick={() => setCreating(true)}><Plus size={18} /> {t("trips.new")}</Button>}
      />

      {trips.isError ? <Alert tone="error">{(trips.error as Error).message}</Alert> : null}

      {trips.isLoading ? (
        <div className="ticket-grid"><Skeleton className="skeleton-line-lg" /><Skeleton className="skeleton-line-lg" /></div>
      ) : sorted.length ? (
        <motion.div className="ticket-grid" variants={list} initial="hidden" animate="show">
          {sorted.map((trip) => (
            <motion.div key={trip.ItemId} variants={item}>
              <TripTicket trip={trip} onOpen={() => onNavigate(`/trips/${trip.ItemId}`)} />
            </motion.div>
          ))}
        </motion.div>
      ) : trips.isSuccess ? (
        <EmptyState
          icon={<Luggage size={26} />}
          title={t("trips.empty")}
          description={t("trips.emptyHint")}
          action={<Button onClick={() => setCreating(true)}><Plus size={18} /> {t("trips.new")}</Button>}
        />
      ) : null}

      <Dialog open={creating} onOpenChange={setCreating}>
        {creating ? <TripFormDialog onClose={() => setCreating(false)} onSaved={(id) => onNavigate(`/trips/${id}`)} /> : null}
      </Dialog>
    </section>
  );
}

export function TripTicket({ onOpen, trip }: { onOpen: () => void; trip: Trip }) {
  const { language, t } = useT();
  const start = trip.startDate ? new Date(trip.startDate) : undefined;
  const length = trip.startDate ? tripDays(trip.startDate, trip.endDate).length : 0;
  const names = alignedNames(trip);

  // Tilt toward the pointer, springing back on leave.
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [5, -5]), { stiffness: 300, damping: 20 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-6, 6]), { stiffness: 300, damping: 20 });

  function track(event: PointerEvent<HTMLButtonElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    x.set((event.clientX - box.left) / box.width - 0.5);
    y.set((event.clientY - box.top) / box.height - 0.5);
  }

  return (
    <motion.button
      className="ticket"
      onClick={onOpen}
      onPointerMove={track}
      onPointerLeave={() => { x.set(0); y.set(0); }}
      style={{ rotateX, rotateY, transformPerspective: 900 }}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="ticket-main">
        <span className="ticket-title">{trip.name}</span>
        <span className="ticket-place"><MapPin size={15} /> {trip.destination}</span>
        <div className="ticket-foot">
          <span className="facepile" aria-hidden="true">
            {names.slice(0, 4).map((name, index) => <span key={index} className={`avatar tone-${index % 4}`}>{initials(name)}</span>)}
          </span>
          <span className="muted"><Users size={14} /> {trip.memberIds.length} {t("trips.members")}</span>
        </div>
      </div>
      <div className="ticket-stub">
        {start ? (
          <>
            <span className="stub-day">{start.toLocaleDateString(language, { day: "numeric", timeZone: "UTC" })}</span>
            <span className="stub-month">{start.toLocaleDateString(language, { month: "short", year: "numeric", timeZone: "UTC" })}</span>
            <span className="stub-length">{length} {length === 1 ? t("trips.day") : t("trips.days")}</span>
          </>
        ) : <span className="stub-month">{t("trips.noDates")}</span>}
      </div>
    </motion.button>
  );
}

function celebrate() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const colors = ["#F3B33D", "#0E8A72", "#FF7B6B", "#4CC3FF", "#A78BFA"];
  void confetti({ particleCount: 90, spread: 75, startVelocity: 42, origin: { y: 0.7 }, colors, zIndex: 9999 });
}

// Creates a trip, or (with `trip`) edits its details. Editing is owner-only;
// the Gateway rejects anyone else's update.
export function TripFormDialog({ onClose, onSaved, trip }: { onClose: () => void; onSaved: (tripId: string) => void; trip?: Trip }) {
  const { language, t } = useT();
  const me = useMe();
  const queryClient = useQueryClient();
  const lang = language.split("-")[0] || "en";
  const initial = trip ? fromTrip(trip) : undefined;
  const [name, setName] = useState(trip?.name ?? "");
  const [dates, setDates] = useState<DayRange>(initial?.dates ?? {});
  const [destination, setDestination] = useState<Destination | undefined>(initial?.destination);
  const [destinationQuery, setDestinationQuery] = useState("");
  const [pin, setPin] = useState<LatLng | undefined>(initial?.pin);
  const [zoom, setZoom] = useState(trip?.address ? 15 : 10);
  const [address, setAddress] = useState(trip?.address ?? "");
  const [lookupError, setLookupError] = useState<string | undefined>();

  // Picking a destination moves the pin there; an address belonged to the
  // previous place, so it is cleared.
  function chooseDestination(next: Destination | undefined, point?: LatLng) {
    setDestination(next);
    if (point) { setPin(point); setZoom(10); }
    if (!next) setPin(undefined);
    setAddress("");
  }

  async function fillDestinationFrom(point: LatLng) {
    if (destination) return;
    const place = await placeAt(point.lat, point.lng, lang, undefined, 10);
    if (place) setDestination({ name: place.name, region: place.region });
  }

  // A picked address pins the exact spot and names the destination if empty.
  function chooseAddress(place: Place) {
    setAddress(place.full);
    setPin({ lat: place.lat, lng: place.lng });
    setZoom(15);
    fillDestinationFrom(place).catch((caught: Error) => setLookupError(caught.message));
  }

  // A map click drops the pin and fills the address (and destination if empty).
  function pickOnMap(point: LatLng) {
    setPin(point);
    setLookupError(undefined);
    Promise.all([
      placeAt(point.lat, point.lng, lang, undefined, 18).then((place) => { if (place) setAddress(place.full); }),
      fillDestinationFrom(point)
    ]).catch((caught: Error) => setLookupError(caught.message));
  }

  const create = useMutation({
    mutationFn: async () => {
      const details = {
        name: name.trim(),
        destination: destination!.region ? `${destination!.name}, ${destination!.region}` : destination!.name,
        destinationLat: pin?.lat,
        destinationLng: pin?.lng,
        address: address.trim() || undefined,
        startDate: toIsoDate(dates.from!),
        endDate: toIsoDate(dates.to ?? dates.from!)
      };
      if (trip) {
        await updateTripDetails(trip, { ...details, destinationLat: pin?.lat ?? null, destinationLng: pin?.lng ?? null, address: details.address ?? "" });
        return trip.ItemId;
      }
      return createTrip(details, me!);
    },
    onSuccess: async (tripId) => {
      if (!trip) celebrate();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["trips"] }),
        trip ? queryClient.invalidateQueries({ queryKey: ["trip", trip.ItemId] }) : Promise.resolve()
      ]);
      onClose();
      if (tripId) onSaved(tripId);
    }
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    create.mutate();
  }

  const valid = Boolean(name.trim() && destination && dates.from);

  return (
    <DialogContent title={trip ? t("trip.edit") : t("trips.new")} description={trip ? t("trip.editHint") : t("trips.newHint")} className="max-w-[960px]">
      <form className="trip-form" onSubmit={submit}>
        <div className="grid content-start gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="trip-name">{t("trips.name")}</Label>
            <Input id="trip-name" required autoFocus placeholder={t("trips.namePlaceholder")} value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>{t("trips.dates")}</Label>
            <DateRangePicker value={dates} onChange={setDates} placeholder={t("trips.datesPlaceholder")} />
          </div>
          <div className="grid gap-1.5">
            <Label>{t("address.label")} <span className="font-normal text-muted-foreground">({t("common.optional")})</span></Label>
            <Suspense fallback={<Input disabled placeholder={t("address.placeholder")} />}>
              <AddressField near={pin} text={address} onText={setAddress} onPick={chooseAddress} />
            </Suspense>
            <p className="text-xs text-muted-foreground">{t("address.hint")}</p>
          </div>
          {!destination ? <p className="text-sm text-muted-foreground">{t("trips.pickDestination")}</p> : null}
          {lookupError ? <Alert tone="error">{lookupError}</Alert> : null}
          {create.isError ? <Alert tone="error">{(create.error as Error).message}</Alert> : null}
          <div className="mt-1 flex justify-end gap-2.5">
            <Button type="button" variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
            <Button type="submit" disabled={!valid || !me || create.isPending}>{trip ? t("common.save") : t("trips.create")}</Button>
          </div>
        </div>
        <Suspense fallback={<div className="picker-map skeleton" />}>
          <DestinationPicker
            destination={destination}
            onDestination={chooseDestination}
            onMapPick={pickOnMap}
            pin={pin}
            zoom={zoom}
            query={destinationQuery}
            onQuery={setDestinationQuery}
          />
        </Suspense>
      </form>
    </DialogContent>
  );
}

// Splits the stored "Name, Region" back into the picker's shape.
function fromTrip(trip: Trip): { dates: DayRange; destination: Destination; pin?: LatLng } {
  const [name = trip.destination, ...rest] = trip.destination.split(",").map((part) => part.trim());
  const pin = typeof trip.destinationLat === "number" && typeof trip.destinationLng === "number" ? { lat: trip.destinationLat, lng: trip.destinationLng } : undefined;
  return {
    dates: { from: trip.startDate?.slice(0, 10), to: trip.endDate?.slice(0, 10) },
    destination: { name, region: rest.join(", ") },
    pin
  };
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function toIsoDate(value: string): string {
  return `${value}T00:00:00.000Z`;
}

export function formatRange(start?: string, end?: string, language?: string): string {
  const format = (value: string) => new Date(value).toLocaleDateString(language, { day: "numeric", month: "short", timeZone: "UTC", year: "numeric" });
  if (!start) return "";
  if (!end || end.slice(0, 10) === start.slice(0, 10)) return format(start);
  return `${format(start)} – ${format(end)}`;
}
