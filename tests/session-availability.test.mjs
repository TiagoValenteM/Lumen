import assert from "node:assert/strict";
import { test } from "node:test";
import { createSessionAvailability } from "../lib/features/find-a-spot/session-availability.ts";
import { matchSpots } from "../lib/features/find-a-spot/matching.ts";
import { parseSpotSearch, spotSearchHref } from "../lib/features/find-a-spot/preferences.ts";
import { parseLocalSessionStart } from "../lib/features/find-a-spot/session-start.ts";
import { getPilotSessionEvidence } from "../lib/features/find-a-spot/session-hours-pilot.ts";

const minutes = (hour, minute = 0) => hour * 60 + minute;
function setup(iso, durationMinutes, weekly, exceptions = {}, timeZone = "Europe/Zurich") {
  const startAt = Date.parse(iso);
  const now = startAt - 1_000;
  const hours = { weekly, exceptions, source: "Venue confirmation", checkedAt: new Date(now).toISOString(), exceptionsCheckedThrough: iso.slice(0, 10) };
  return { evaluate: createSessionAvailability({ startAt, now, durationMinutes }), schedule: { timeZone, opening: hours, laptopAccess: hours } };
}

test("fits only when both verified schedules cover the complete session", () => {
  const { evaluate, schedule } = setup("2026-11-16T08:00:00Z", 120, { Mon: [[minutes(9), minutes(11)]] });
  assert.equal(evaluate(schedule), "fits");
  assert.equal(evaluate({ ...schedule, laptopAccess: null }), "unknown");
  assert.equal(evaluate({ ...schedule, laptopAccess: { ...schedule.laptopAccess, weekly: { Mon: [[minutes(9), minutes(10, 59)]] } } }), "does_not_fit");
  assert.equal(evaluate({ ...schedule, laptopAccess: { ...schedule.laptopAccess, weekly: { Mon: [[540, 600], [601, 660]] } } }), "does_not_fit");
  assert.equal(evaluate({ ...schedule, opening: { ...schedule.opening, source: "" } }), "unknown");
});

test("explicit date exceptions override weekly hours and unverified dates remain unknown", () => {
  const { evaluate, schedule } = setup("2026-11-16T08:00:00Z", 60, { Mon: [[0, 1440]] });
  const override = { ...schedule.opening, exceptions: { "2026-11-16": [] } };
  assert.equal(evaluate({ ...schedule, opening: override }), "does_not_fit");
  assert.equal(evaluate({ ...schedule, opening: { ...schedule.opening, exceptionsCheckedThrough: "2026-11-15" } }), "unknown");
  assert.equal(evaluate({ ...schedule, opening: { ...schedule.opening, checkedAt: "2025-11-16T08:00:00Z" } }), "unknown");
  assert.equal(evaluate({ ...schedule, opening: { ...schedule.opening, weekly: { Mon: [[0, 1441]] } } }), "unknown");
  assert.equal(evaluate({ ...schedule, timeZone: "Not/AZone" }), "unknown");
});

test("overnight sessions require evidence on both local dates, even if UTC has not rolled over", () => {
  const { evaluate, schedule } = setup("2026-11-16T22:30:00Z", 60, { Mon: [[1380, 1440]], Tue: [[0, 60]] });
  assert.equal(evaluate(schedule), "unknown");
  const extended = { ...schedule.opening, exceptionsCheckedThrough: "2026-11-17" };
  assert.equal(evaluate({ ...schedule, opening: extended, laptopAccess: extended }), "fits");
  assert.equal(evaluate({ ...schedule, opening: { ...extended, exceptions: { "2026-11-17": [] } }, laptopAccess: extended }), "does_not_fit");
});

test("daylight-saving changes use elapsed minutes, not differences in wall-clock hours", () => {
  const spring = setup("2026-03-29T00:30:00Z", 60, { Sun: [[90, 120], [180, 210]] });
  assert.equal(spring.evaluate(spring.schedule), "fits");
  const fall = setup("2026-10-25T00:30:00Z", 60, { Sun: [[120, 180]] });
  assert.equal(fall.evaluate(fall.schedule), "fits");
  assert.equal(fall.evaluate({ ...fall.schedule, laptopAccess: { ...fall.schedule.laptopAccess, weekly: { Sun: [[150, 180]] } } }), "does_not_fit");
});

test("matcher leaves unknown hours unconfirmed and excludes a definite conflict", () => {
  const now = Date.parse("2026-11-16T08:00:00Z");
  const place = { id: "place", laptop_friendly: true, time_limit_hours: 3, checkedAt: new Date(now).toISOString() };
  const prefs = { minutes: 120, activity: "general", wifi: false, power: false };
  assert.equal(matchSpots([place], prefs, { now }).matches.length, 1);
  assert.equal(matchSpots([place], prefs, { now, sessionAvailability: () => "fits" }).matches.length, 1);
  const unknown = matchSpots([place], prefs, { now, sessionAvailability: () => "unknown" });
  assert.equal(unknown.matches.length, 0);
  assert.deepEqual(unknown.details[0].toCheck, ["Opening hours and laptop access for this session"]);
  assert.deepEqual(matchSpots([place], prefs, { now, sessionAvailability: () => "does_not_fit" }), { matches: [], details: [] });
});

test("scheduled links use a canonical UTC minute and reject invalid calendar dates", () => {
  const url = "/find?city=new-york&session=2026-11-18T04%3A00Z";
  assert.equal(spotSearchHref(parseSpotSearch(new URL(url, "https://example.com").searchParams)), url);
  for (const invalid of ["2026-02-31T15:00Z", "2026-11-16T24:00Z", "2026-11-17T12:30", "today"]) {
    assert.equal(parseSpotSearch(new URLSearchParams({ session: invalid })).sessionStart, null);
  }
  assert.equal(spotSearchHref(parseSpotSearch(new URLSearchParams("session=now"))), "/find?session=now");
});

test("local inputs reject elapsed times and DST gaps or repetitions", () => {
  const previous = process.env.TZ;
  process.env.TZ = "Europe/Zurich";
  try {
    const now = Date.parse("2026-01-01T00:00Z");
    assert.deepEqual(parseLocalSessionStart("2026-11-18T10:00", now), { start: "2026-11-18T09:00Z" });
    assert.ok(parseLocalSessionStart("2026-03-29T02:15", now).error);
    assert.ok(parseLocalSessionStart("2026-10-25T02:15", now).error);
    assert.ok(parseLocalSessionStart("2025-11-18T10:00", now).error);
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});

test("published pilot evidence is bound to the listing and only qualifies the session it actually supports", () => {
  const place = { id: "54f3915e-e27b-4927-94c8-afeaaa023956", slug: "fiction-bar-cafe-new-york",
    address: "308 Hooper Street, Brooklyn, New York, New York, 11211",
    laptop_friendly: true, time_limit_hours: null, checkedAt: null, has_wifi: null };
  const unknown = { ...place, id: "different", time_limit_hours: 3 };
  assert.equal(getPilotSessionEvidence({ ...place, address: "A different location" }), null);
  const prefs = { minutes: 120, activity: "general", wifi: false, power: false };
  const now = Date.parse("2026-11-16T21:30Z");
  const evaluate = (iso, duration) => createSessionAvailability({ now, startAt: Date.parse(iso), durationMinutes: duration });
  const evidence = getPilotSessionEvidence(place);
  const run = (iso, preferences = prefs) => matchSpots([place, unknown], preferences, {
    now,
    sessionAvailability: (p) => evaluate(iso, preferences.minutes)(getPilotSessionEvidence(p)?.schedule),
    sessionEvidence: (p) => getPilotSessionEvidence(p) ?? undefined,
  });
  const covered = run("2026-11-18T04:00Z");
  assert.equal(covered.matches[0].place.id, place.id);
  assert.equal(covered.matches[0].sessionEvidence.source, evidence.source);
  assert.equal(covered.details[0].place.id, unknown.id);
  assert.equal(run("2026-11-18T04:00Z", { ...prefs, wifi: true }).matches.length, 0);
  assert.equal(run("2026-11-18T04:00Z", { ...prefs, minutes: 180 }).details.length, 1);
  assert.equal(run("2026-11-18T11:00Z").details.length, 1);
  assert.equal(run("2026-11-26T16:00Z").details.length, 2);
});
