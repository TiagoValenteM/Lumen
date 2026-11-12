import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_PREFERENCES, parseSpotSearch, spotSearchHref } from "../lib/features/find-a-spot/preferences.ts";
import { distanceBetweenKm, hasSpotCoordinates, matchSpots } from "../lib/features/find-a-spot/matching.ts";
import { getWorkspaceDirections } from "../lib/features/locations/directions.ts";

const now = Date.parse("2026-11-12T08:00:00Z");
const ids = (rows) => rows.map(({ place }) => place.id);
const place = (id, fields) => ({
  id, slug: id, name: id, type: "cafe", address: null, latitude: 47.37, longitude: 8.54,
  laptop_friendly: true, time_limit_hours: 2, has_wifi: true, has_power_outlets: true,
  noise_level: "quiet", good_for_calls: true, checkedAt: "2026-11-10T12:00:00Z", photoUrl: null, ...fields,
});

test("a known no, short stay, or failed requirement never appears in the shortlist", () => {
  const result = matchSpots([
    place("no-laptops", { laptop_friendly: false }), place("too-short", { time_limit_hours: 1.5 }),
    place("no-wifi", { has_wifi: false }), place("no-power", { has_power_outlets: false }),
    place("loud", { noise_level: "loud" }), place("exact"),
  ], { ...DEFAULT_PREFERENCES, activity: "focus", wifi: true, power: true }, { now });
  assert.deepEqual(ids(result.matches), ["exact"]);
  assert.deepEqual(result.details, []);
  assert.ok(result.matches[0].reasons.includes("2-hour stay limit"));
});

test("unknown, stale, and historical zero stay limits are not presented as matches", () => {
  const result = matchSpots([
    place("unknown-wifi", { has_wifi: null }), place("unknown-policy", { laptop_friendly: null }),
    place("unknown-stay", { time_limit_hours: null }), place("old", { checkedAt: "2024-01-01" }),
    place("future", { checkedAt: "2027-01-01" }), place("unset-zero", { time_limit_hours: 0, checkedAt: null }),
    place("checked-zero", { time_limit_hours: 0 }),
  ], { ...DEFAULT_PREFERENCES, minutes: 180, wifi: true }, { now });
  assert.deepEqual(ids(result.matches), ["checked-zero"]);
  assert.ok(result.matches[0].reasons.includes("No stated stay limit"));
  assert.ok(result.details.find(({ place }) => place.id === "unset-zero").toCheck.includes("Stay limit"));
  for (const [id, fields] of [["wifi", { has_wifi: null }], ["policy", { laptop_friendly: null }], ["stale", { checkedAt: "2024-01-01" }], ["future", { checkedAt: "2027-01-01" }]]) {
    const single = matchSpots([place(id, fields)], { ...DEFAULT_PREFERENCES, wifi: true }, { now });
    assert.deepEqual(ids(single.details), [id]);
  }
});

test("a call or focus match requires a positive activity report; defaults are not proof", () => {
  const call = matchSpots([place("yes"), place("default", { good_for_calls: false })], { ...DEFAULT_PREFERENCES, activity: "call" }, { now });
  assert.deepEqual(ids(call.matches), ["yes"]);
  assert.deepEqual(call.details[0].toCheck, ["Call suitability"]);
  const focus = matchSpots([place("default", { noise_level: "moderate" })], { ...DEFAULT_PREFERENCES, activity: "focus" }, { now });
  assert.deepEqual(focus.details[0].toCheck, ["Noise level"]);
});

test("a radius has a strict edge, missing coordinates stay uncertain, and ordering is stable", () => {
  const places = [place("b"), place("a"), place("outer"), place("missing", { latitude: null }), place("closest")];
  const distances = { b: 3, a: 3, outer: 3.01, missing: null, closest: 0.5 };
  let calls = 0;
  const result = matchSpots(places, DEFAULT_PREFERENCES, { now, radiusKm: 3, distanceKm: (row) => { calls++; return distances[row.id]; } });
  assert.deepEqual(ids(result.matches), ["closest", "a", "b"]);
  assert.deepEqual(ids(result.details), ["missing"]);
  assert.deepEqual(result.details[0].toCheck, ["Distance"]);
  assert.equal(calls, places.length);
  assert.equal(hasSpotCoordinates({ latitude: 0, longitude: 0 }), true);
  assert.equal(hasSpotCoordinates({ latitude: NaN, longitude: 0 }), false);
  assert.ok(distanceBetweenKm({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 }) > 111);
});

test("shared URLs contain only canonical filters and directions use a destination, not the user's location", () => {
  const params = new URLSearchParams("city=zurich&activity=focus&minutes=180&wifi=1&radius=3&text=private&latitude=47.37");
  assert.equal(spotSearchHref(parseSpotSearch(params)), "/find?city=zurich&activity=focus&minutes=180&wifi=1&radius=3");
  assert.equal(spotSearchHref(parseSpotSearch(new URLSearchParams("city=%3Cscript%3E&minutes=90&radius=100&wifi=yes"))), "/find");
  const directions = new URL(getWorkspaceDirections(place("fixture", { latitude: 0, longitude: 0 })));
  assert.equal(directions.pathname, "/maps/dir/");
  assert.equal(directions.searchParams.get("destination"), "0,0");
  assert.equal(directions.searchParams.has("origin"), false);
  assert.equal(getWorkspaceDirections({ name: "Unmapped" }), null);
});
