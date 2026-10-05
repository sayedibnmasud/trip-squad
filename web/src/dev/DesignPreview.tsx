import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { ReactNode } from "react";
import { AppShell } from "../app/layout/AppShell";
import { LoginPage } from "../features/auth/LoginPage";
import { MyTripsPage } from "../features/trips/MyTripsPage";
import { TripPage } from "../features/trips/TripPage";

// Development-only design preview: renders real pages from seeded query cache
// so layouts can be reviewed without signing in. Routed only when
// import.meta.env.DEV is true, so production builds drop it.

const ME = { id: "u-me", name: "Sayed Admin" };
const MEMBERS = ["u-me", "u-nadia", "u-rafi", "u-tanvir"];
const NAMES = ["Sayed Admin", "Nadia Rahman", "Rafi Hasan", "Tanvir Alam"];
const day = (iso: string) => `${iso}T00:00:00.000Z`;

const TRIPS = [
  { ItemId: "t-cox", name: "Winter beach weekend", destination: "Cox's Bazar, Chattogram Division, Bangladesh", destinationLat: 21.4272, destinationLng: 92.0058, startDate: day("2026-12-12"), endDate: day("2026-12-15"), memberIds: MEMBERS, memberNames: NAMES, inviteCode: "abc" },
  { ItemId: "t-sajek", name: "Sajek with the office gang", destination: "Sajek Valley, Rangamati, Bangladesh", destinationLat: 23.3818, destinationLng: 92.2938, startDate: day("2027-01-23"), endDate: day("2027-01-25"), memberIds: MEMBERS.slice(0, 3), memberNames: NAMES.slice(0, 3), inviteCode: "abc" },
  { ItemId: "t-pokhara", name: "Pokhara after exams", destination: "Pokhara, Gandaki Province, Nepal", destinationLat: 28.2096, destinationLng: 83.9856, startDate: day("2027-03-02"), endDate: day("2027-03-08"), memberIds: MEMBERS.slice(0, 2), memberNames: NAMES.slice(0, 2), inviteCode: "abc" }
];

const SUGGESTIONS = [
  { ItemId: "s1", tripId: "t-cox", title: "Sunset at Laboni Beach", type: "place", notes: "Go before 5pm, it gets crowded", memberIds: MEMBERS, CreatedBy: "u-nadia" },
  { ItemId: "s2", tripId: "t-cox", title: "Rupchanda fry at Poushee", type: "food", notes: "", memberIds: MEMBERS, CreatedBy: "u-rafi" },
  { ItemId: "s3", tripId: "t-cox", title: "Marine Drive to Inani by CNG", type: "activity", notes: "Half a day, split one CNG between four", memberIds: MEMBERS, CreatedBy: "u-me" },
  { ItemId: "s4", tripId: "t-cox", title: "Himchari waterfall", type: "place", notes: "", memberIds: MEMBERS, CreatedBy: "u-tanvir" }
];
const VOTES = [
  ...["u-me", "u-nadia", "u-rafi"].map((user, index) => ({ ItemId: `v1${index}`, tripId: "t-cox", suggestionId: "s1", value: 1, memberIds: MEMBERS, CreatedBy: user })),
  ...["u-me", "u-tanvir"].map((user, index) => ({ ItemId: `v2${index}`, tripId: "t-cox", suggestionId: "s3", value: 1, memberIds: MEMBERS, CreatedBy: user })),
  { ItemId: "v30", tripId: "t-cox", suggestionId: "s2", value: 1, memberIds: MEMBERS, CreatedBy: "u-rafi" },
  { ItemId: "v40", tripId: "t-cox", suggestionId: "s4", value: -1, memberIds: MEMBERS, CreatedBy: "u-me" }
];
const ITINERARY = [
  { ItemId: "i1", tripId: "t-cox", date: day("2026-12-12"), items: ["Check in near Kolatoli", "Sunset at Laboni Beach", "Rupchanda fry at Poushee"], memberIds: MEMBERS },
  { ItemId: "i2", tripId: "t-cox", date: day("2026-12-13"), items: ["Marine Drive to Inani by CNG"], memberIds: MEMBERS }
];
const EXPENSES = [
  { ItemId: "e1", tripId: "t-cox", description: "Hotel, 3 nights", amount: 18000, currency: "BDT", paidBy: "u-nadia", splitBetween: MEMBERS, memberIds: MEMBERS },
  { ItemId: "e2", tripId: "t-cox", description: "Bus tickets", amount: 7200, currency: "BDT", paidBy: "u-me", splitBetween: MEMBERS, memberIds: MEMBERS },
  { ItemId: "e3", tripId: "t-cox", description: "CNG to Inani", amount: 2400, currency: "BDT", paidBy: "u-rafi", splitBetween: ["u-me", "u-rafi", "u-tanvir"], memberIds: MEMBERS }
];

function Seed({ children, empty }: { children: ReactNode; empty?: boolean }) {
  const queryClient = useQueryClient();
  useState(() => {
    queryClient.setDefaultOptions({ queries: { staleTime: Infinity, retry: false } });
    queryClient.setQueryData(["iam", "me"], { data: { itemId: ME.id, firstName: "Sayed", lastName: "Admin", email: "admin@example.com", roles: ["tripsquad-admin"], permissions: [] } });
    queryClient.setQueryData(["trips"], empty ? [] : TRIPS);
    for (const trip of TRIPS) queryClient.setQueryData(["trip", trip.ItemId], trip);
    queryClient.setQueryData(["suggestions", "t-cox"], SUGGESTIONS);
    queryClient.setQueryData(["votes", "t-cox"], VOTES);
    queryClient.setQueryData(["itinerary", "t-cox"], ITINERARY);
    queryClient.setQueryData(["expenses", "t-cox"], EXPENSES);
    return true;
  });
  return <>{children}</>;
}

export function DesignPreview({ path }: { path: string }) {
  const noop = () => undefined;
  const page = path.replace(/^\/__preview\/?/, "");
  if (page === "login") return <LoginPage />;
  return (
    <Seed empty={page === "empty"}>
      <AppShell activePath="/" onNavigate={noop}>
        {page === "trip" ? <TripPage tripId="t-cox" /> : <MyTripsPage onNavigate={noop} />}
      </AppShell>
    </Seed>
  );
}
