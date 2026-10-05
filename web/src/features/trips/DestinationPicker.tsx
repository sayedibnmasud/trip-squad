import { AnimatePresence, motion } from "framer-motion";
import { MapPin, Navigation, X } from "lucide-react";
import { useCallback } from "react";
import { PlaceAutocomplete } from "../../components/ui/place-autocomplete";
import { useT } from "../../lib/i18n/LocalizationProvider";
import { addressLines, searchPlaces } from "./geocoding";
import type { Place } from "./geocoding";
import { TripMap } from "./TripMap";
import type { LatLng } from "./TripMap";

// Where the map opens before anything is picked: Bangladesh, the app's home market.
const START = { lat: 23.8, lng: 90.3 };
const START_ZOOM = 6;

export type Destination = Pick<Place, "name" | "region">;

type PlaceRow = Place & { title: string; subtitle: string };

// Default bias when nothing is pinned yet: Bangladesh, the app's home market.
const HOME_BIAS = { lat: 23.7, lng: 90.4 };

function useSearch(kind: "destination" | "address", near?: LatLng) {
  const { language } = useT();
  const lang = language.split("-")[0] || "en";
  const lat = near?.lat;
  const lng = near?.lng;
  return useCallback(async (text: string, signal: AbortSignal): Promise<PlaceRow[]> => {
    const bias = lat !== undefined && lng !== undefined ? { lat, lng } : HOME_BIAS;
    const places = await searchPlaces(text, lang, signal, bias, kind === "address" && lat !== undefined ? 0.6 : 4);
    return places.map((place) => kind === "destination"
      ? { ...place, title: place.name, subtitle: place.region }
      : { ...place, ...addressLines(place.full) });
  }, [kind, lang, lat, lng]);
}

// Destination search + the map. The pin is shared with the address field,
// so the parent owns it.
export function DestinationPicker({
  destination,
  onDestination,
  onMapPick,
  pin,
  query,
  onQuery,
  zoom
}: {
  destination: Destination | undefined;
  onDestination: (destination: Destination | undefined, point?: LatLng) => void;
  onMapPick: (point: LatLng) => void;
  pin: LatLng | undefined;
  query: string;
  onQuery: (text: string) => void;
  zoom: number;
}) {
  const { t } = useT();
  const search = useSearch("destination");

  return (
    <div className="grid content-start gap-3">
      <PlaceAutocomplete<PlaceRow>
        text={query}
        onTextChange={onQuery}
        search={search}
        placeholder={t("picker.search")}
        noResults={t("picker.none")}
        freeTextLabel={(typed) => <><strong>{t("picker.useTyped")} “{typed}”</strong> <span className="text-muted-foreground">({t("picker.noPin")})</span></>}
        onPick={(item) => {
          onQuery("");
          if (item.id === "typed") onDestination({ name: item.title, region: "" });
          else onDestination({ name: (item as PlaceRow).name, region: (item as PlaceRow).region }, { lat: (item as PlaceRow).lat, lng: (item as PlaceRow).lng });
        }}
      />

      <div className="picker-map">
        <TripMap center={pin ?? START} zoom={pin ? zoom : START_ZOOM} marker={pin} onPick={onMapPick} />
        <AnimatePresence>
          {!pin ? (
            <motion.span className="picker-hint" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
              <Navigation size={14} /> {t("picker.hint")}
            </motion.span>
          ) : null}
        </AnimatePresence>
      </div>

      <AnimatePresence initial={false}>
        {destination ? (
          <motion.div
            key={destination.name}
            className="picked"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
          >
            <span className="grid h-10 w-10 place-items-center rounded-full bg-accent text-foreground"><MapPin size={20} /></span>
            <div className="min-w-0 flex-1">
              <strong>{destination.name}</strong>
              <small>{destination.region || (pin ? "" : t("picker.noPin"))}</small>
            </div>
            <button type="button" className="icon-button" aria-label={t("picker.clear")} onClick={() => onDestination(undefined)}><X size={16} /></button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function AddressField({ near, onPick, onText, text }: { near?: LatLng; onPick: (place: Place) => void; onText: (text: string) => void; text: string }) {
  const { t } = useT();
  const search = useSearch("address", near);
  return (
    <PlaceAutocomplete<PlaceRow>
      text={text}
      onTextChange={onText}
      search={search}
      icon={<Navigation size={18} className="text-muted-foreground" />}
      placeholder={t("address.placeholder")}
      noResults={t("address.none")}
      freeTextLabel={(typed) => <><strong>{t("picker.useTyped")} “{typed}”</strong></>}
      onPick={(item) => {
        if (item.id === "typed") onText(item.title);
        else onPick(item as PlaceRow);
      }}
    />
  );
}
