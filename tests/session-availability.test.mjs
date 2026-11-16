import assert from "node:assert/strict";
import { test } from "node:test";
import { createSessionAvailability } from "../lib/features/find-a-spot/session-availability.ts";
import { matchSpots } from "../lib/features/find-a-spot/matching.ts";

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
