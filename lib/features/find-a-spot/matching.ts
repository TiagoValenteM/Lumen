import type { SpotPreferences } from "./preferences";

export type SpotPlace = {
  id: string;
  slug: string;
  name: string;
  type: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  laptop_friendly: boolean | null;
  time_limit_hours: number | null;
  has_wifi: boolean | null;
  has_power_outlets: boolean | null;
  noise_level: string | null;
  good_for_calls: boolean | null;
  checkedAt: string | null;
  photoUrl: string | null;
};

export type SpotCandidate = {
  place: SpotPlace;
  reasons: string[];
  toCheck: string[];
  distance: number | null;
};

export const FACT_CHECK_MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000;

export function hasSpotCoordinates<T extends Pick<SpotPlace, "latitude" | "longitude">>(place: T): place is T & { latitude: number; longitude: number } {
  return typeof place.latitude === "number" && Math.abs(place.latitude) <= 90 &&
    typeof place.longitude === "number" && Math.abs(place.longitude) <= 180;
}

export function matchSpots(places: readonly SpotPlace[], preferences: SpotPreferences, options: {
  now: number;
  radiusKm?: number;
  distanceKm?: (place: SpotPlace) => number | null;
}) {
  const matches: SpotCandidate[] = [];
  const details: SpotCandidate[] = [];

  for (const place of places) {
    const limit = typeof place.time_limit_hours === "number" && Number.isFinite(place.time_limit_hours) && place.time_limit_hours > 0
      ? place.time_limit_hours : null;
    if (place.laptop_friendly === false || (limit !== null && limit * 60 < preferences.minutes) ||
      (preferences.wifi && place.has_wifi === false) || (preferences.power && place.has_power_outlets === false) ||
      (preferences.activity === "focus" && place.noise_level === "loud")) continue;

    const computedDistance = options.distanceKm?.(place);
    const distance = typeof computedDistance === "number" && Number.isFinite(computedDistance) && computedDistance >= 0 ? computedDistance : null;
    if (options.radiusKm !== undefined && distance !== null && distance > options.radiusKm) continue;

    const reasons: string[] = [];
    const toCheck: string[] = [];
    const checked = Date.parse(place.checkedAt ?? "");
    const recentCheck = checked <= options.now && options.now - checked <= FACT_CHECK_MAX_AGE_MS;
    if (!recentCheck) toCheck.push("Current work policies");
    if (place.laptop_friendly === true && recentCheck) reasons.push("Laptops welcome");
    else if (place.laptop_friendly !== true) toCheck.push("Laptop policy");
    if (limit !== null && recentCheck) reasons.push(`${limit}-hour stay limit`);
    else if (place.time_limit_hours === 0 && recentCheck) reasons.push("No stated stay limit");
    else if (limit === null) toCheck.push("Stay limit");

    for (const [required, actual, label] of [
      [preferences.wifi, place.has_wifi, "Wi-Fi"],
      [preferences.power, place.has_power_outlets, "Outlets"],
    ] as const) {
      if (required && actual !== true) toCheck.push(label);
      if (actual === true && recentCheck) reasons.push(label);
    }
    if (preferences.activity === "focus") {
      if (place.noise_level === "quiet") reasons.push("Reported quiet");
      else toCheck.push("Noise level");
    } else if (preferences.activity === "call") {
      if (place.good_for_calls === true) reasons.push("Reported call-friendly");
      else toCheck.push("Call suitability");
    }
    if (options.radiusKm !== undefined && distance === null) toCheck.push("Distance");

    (toCheck.length ? details : matches).push({ place, reasons, toCheck, distance });
  }

  const compare = (a: SpotCandidate, b: SpotCandidate) => {
    const distanceOrder = (a.distance ?? Infinity) - (b.distance ?? Infinity);
    const evidenceOrder = (Date.parse(b.place.checkedAt ?? "") || 0) - (Date.parse(a.place.checkedAt ?? "") || 0);
    const amenitiesOrder = b.reasons.length - a.reasons.length;
    return a.toCheck.length - b.toCheck.length || distanceOrder || evidenceOrder || amenitiesOrder ||
      (a.place.id < b.place.id ? -1 : Number(a.place.id > b.place.id));
  };
  return { matches: matches.sort(compare), details: details.sort(compare) };
}

export function distanceBetweenKm(origin: { latitude: number; longitude: number }, destination: { latitude: number; longitude: number }) {
  const radians = Math.PI / 180;
  const latitudeDifference = (destination.latitude - origin.latitude) * radians;
  const longitudeDifference = (destination.longitude - origin.longitude) * radians;
  const haversine = Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(origin.latitude * radians) * Math.cos(destination.latitude * radians) * Math.sin(longitudeDifference / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(Math.min(1, haversine)));
}
