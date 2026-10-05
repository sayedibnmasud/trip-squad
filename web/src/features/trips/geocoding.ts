// Place search for the destination picker, backed by OpenStreetMap's public
// Nominatim service. Its usage policy allows roughly one request per second
// with no bulk use, so callers debounce input and cancel stale requests. For
// production traffic, point NOMINATIM_URL at a self-hosted or paid instance.
const NOMINATIM_URL = "https://nominatim.openstreetmap.org";

export type Place = {
  id: string;
  name: string;
  region: string;
  // Full postal-style line, used for the address field.
  full: string;
  lat: number;
  lng: number;
};

type NominatimResult = {
  place_id: number;
  lat: string;
  lon: string;
  name?: string;
  display_name: string;
  address?: Record<string, string | undefined>;
};

// Administrative suffixes that make poor trip names ("Sreemangal Upazila").
const ADMIN_SUFFIX = /\s+(upazila|upazilla|thana|district|division|municipality|sadar)$/i;

const LOCALITY_KEYS = ["city", "town", "village", "municipality", "county", "state_district", "state"];

// "Cox's Bazar" + "Chattogram, Bangladesh" rather than Nominatim's full
// comma-separated display_name.
export function toPlace(result: NominatimResult): Place {
  const address = result.address ?? {};
  const parts = result.display_name.split(",").map((part) => part.trim()).filter(Boolean);
  const name = (result.name?.trim() || parts[0] || result.display_name).replace(ADMIN_SUFFIX, "");
  const locality = LOCALITY_KEYS.map((key) => address[key]).find((value) => value && value !== name);
  const structured = [locality, address.country].filter((value, index, all) => value && value !== name && all.indexOf(value) === index);
  const region = address.country ? structured.join(", ") : parts.slice(1).slice(-2).join(", ");
  return { id: String(result.place_id), name, region, full: result.display_name, lat: Number(result.lat), lng: Number(result.lon) };
}

export function placeLabel(place: Pick<Place, "name" | "region">): string {
  return place.region ? `${place.name}, ${place.region}` : place.name;
}

// `near` biases (does not restrict) results to a box around a point, so an
// address search ranks places close to the chosen destination first.
export async function searchPlaces(query: string, language: string, signal?: AbortSignal, near?: { lat: number; lng: number }, radiusDeg = 1.5): Promise<Place[]> {
  const params = new URLSearchParams({ q: query, format: "jsonv2", addressdetails: "1", limit: "6", "accept-language": language });
  if (near) params.set("viewbox", [near.lng - radiusDeg, near.lat + radiusDeg, near.lng + radiusDeg, near.lat - radiusDeg].join(","));
  const response = await fetch(`${NOMINATIM_URL}/search?${params}`, { signal });
  if (!response.ok) throw new Error(`Place search failed (${response.status}). Try again in a moment.`);
  return ((await response.json()) as NominatimResult[]).map(toPlace);
}

// zoom 10 names the town or area (destination); 18 names the building or
// street (address).
export async function placeAt(lat: number, lng: number, language: string, signal?: AbortSignal, zoom: 10 | 18 = 10): Promise<Place | undefined> {
  const params = new URLSearchParams({ lat: String(lat), lon: String(lng), format: "jsonv2", addressdetails: "1", zoom: String(zoom), "accept-language": language });
  const response = await fetch(`${NOMINATIM_URL}/reverse?${params}`, { signal });
  if (!response.ok) throw new Error(`Couldn't name that spot (${response.status}). Try searching instead.`);
  const result = (await response.json()) as NominatimResult & { error?: string };
  if (result.error) return undefined;
  // Keep the exact clicked point rather than the snapped feature centre.
  return { ...toPlace(result), lat, lng };
}

// Splits a full address into a headline (first two parts) and the rest, for
// two-line autocomplete rows.
export function addressLines(full: string): { title: string; subtitle: string } {
  const parts = full.split(",").map((part) => part.trim()).filter(Boolean);
  return { title: parts.slice(0, 2).join(", "), subtitle: parts.slice(2).join(", ") };
}
