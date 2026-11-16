import assert from "node:assert/strict";
import { test } from "node:test";
import { parseWindows, parseSessionHours, toSessionHoursInput } from "../lib/features/session-hours/editor.ts";

test("weekly and holiday input distinguishes unknown, closed, split windows and 24:00", () => {
  assert.equal(parseWindows(""), undefined);
  assert.deepEqual(parseWindows("closed"), []);
  assert.deepEqual(parseWindows("09:30-12:00, 14:00-24:00"), [[570, 720], [840, 1440]]);
  for (const invalid of ["25:00-24:00", "23:00-02:00", "09:75-10:00", "11:00-12:00, 11:30-13:00", "24:00-24:00"]) {
    assert.throws(() => parseWindows(invalid));
  }
});

test("incomplete drafts round-trip but cannot be published without independent sources", () => {
  const input = toSessionHoursInput();
  assert.deepEqual(toSessionHoursInput(parseSessionHours(input, false)), input);
  assert.throws(() => parseSessionHours(input, true), /timezone/);
  input.timeZone = "Europe/Zurich";
  const policy = { ...input.opening, source: "https://example.org/hours", coverageSource: "https://example.org/holidays",
    through: "2026-12-25", weekly: { Mon: "08:00-12:00" }, exceptions: [{ date: "2026-12-25", windows: "Closed" }] };
  input.opening = policy;
  assert.throws(() => parseSessionHours(input, true), /Laptop access/);
  input.laptopAccess = { ...policy, maxMinutes: "120" };
  const valid = parseSessionHours(input, true);
  assert.deepEqual(valid.laptopAccess.exceptions["2026-12-25"], []);
  assert.equal(valid.laptopAccess.maxSessionMinutes, 120);
  input.laptopAccess.exceptions = [...policy.exceptions, policy.exceptions[0]];
  assert.throws(() => parseSessionHours(input, true), /duplicate/);
  input.laptopAccess.exceptions = [{ date: "2026-12-26", windows: "Closed" }];
  assert.throws(() => parseSessionHours(input, true), /coverage period/);
  input.laptopAccess.source = "https://user:password@example.org/";
  assert.throws(() => parseSessionHours(input, true), /public HTTPS/);
});
