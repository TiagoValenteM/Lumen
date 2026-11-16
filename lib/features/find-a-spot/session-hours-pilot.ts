import type { VenueSessionSchedule, VerifiedHours } from "./session-availability";

const fictionAbout = "https://fictionbk.com/about";
const weekday = [[0, 120], [420, 1440]] as const;
const weekend = [[0, 120], [480, 1440]] as const;
const opening: VerifiedHours = {
  source: fictionAbout,
  checkedAt: "2026-11-16T21:00:00Z",
  // The public listings checked cover the pre-Thanksgiving week only.
  exceptionsCheckedThrough: "2026-11-22",
  weekly: { Mon: weekday, Tue: weekday, Wed: weekday, Thu: weekday, Fri: weekday, Sat: weekend, Sun: weekend },
  exceptions: {},
};

const fictionSchedule: VenueSessionSchedule = {
  timeZone: "America/New_York",
  opening,
  // The venue welcomes laptops without publishing separate laptop hours.
  laptopAccess: { ...opening, maxSessionMinutes: 120 },
};

export function getPilotSessionEvidence(place: { id: string; slug: string; address: string | null }) {
  if (place.id !== "54f3915e-e27b-4927-94c8-afeaaa023956" ||
    place.slug !== "fiction-bar-cafe-new-york" ||
    place.address !== "308 Hooper Street, Brooklyn, New York, New York, 11211") return null;

  return { schedule: fictionSchedule, source: fictionAbout, note: "Two-hour table limit and two-drink minimum.", maxMinutes: 120 };
}
