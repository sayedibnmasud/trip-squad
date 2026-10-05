import { describe, expect, it } from "vitest";
import { addressLines, placeLabel, toPlace } from "./geocoding";

describe("toPlace", () => {
  it("uses the place name plus its locality and country", () => {
    const place = toPlace({
      place_id: 1,
      lat: "21.4272",
      lon: "92.0058",
      name: "Cox's Bazar",
      display_name: "Cox's Bazar, Cox's Bazar Sadar, Cox's Bazar District, Chattogram Division, Bangladesh",
      address: { town: "Cox's Bazar", state: "Chattogram Division", country: "Bangladesh" }
    });
    expect(place).toMatchObject({ id: "1", name: "Cox's Bazar", region: "Chattogram Division, Bangladesh", lat: 21.4272, lng: 92.0058 });
    expect(placeLabel(place)).toBe("Cox's Bazar, Chattogram Division, Bangladesh");
  });

  it("falls back to display_name parts when there is no structured address", () => {
    const place = toPlace({ place_id: 2, lat: "1", lon: "2", display_name: "Sajek Valley, Rangamati, Bangladesh" });
    expect(place.name).toBe("Sajek Valley");
    expect(place.region).toBe("Rangamati, Bangladesh");
  });

  it("does not repeat the country when it is the place itself", () => {
    const place = toPlace({ place_id: 3, lat: "1", lon: "2", name: "Nepal", display_name: "Nepal", address: { country: "Nepal" } });
    expect(placeLabel(place)).toBe("Nepal");
  });

  it("drops administrative suffixes from the place name", () => {
    const place = toPlace({ place_id: 4, lat: "24.3", lon: "91.7", name: "Sreemangal Upazila", display_name: "Sreemangal Upazila, Moulvibazar District, Sylhet Division, Bangladesh", address: { state_district: "Moulvibazar District", country: "Bangladesh" } });
    expect(place.name).toBe("Sreemangal");
    expect(place.region).toBe("Moulvibazar District, Bangladesh");
  });
});

describe("addressLines", () => {
  it("puts the first two parts on top and the rest underneath", () => {
    expect(addressLines("Hotel Sea Crown, Marine Drive, Kolatoli, Cox's Bazar, Bangladesh")).toEqual({ title: "Hotel Sea Crown, Marine Drive", subtitle: "Kolatoli, Cox's Bazar, Bangladesh" });
  });
});
