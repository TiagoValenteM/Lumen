import type { VerifiedHours } from "../find-a-spot/session-availability";

export const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export type Weekday = (typeof weekdays)[number];
type Policy = Omit<VerifiedHours, "checkedAt"> & { coverageSource: string };
export type SessionHoursPayload = { timeZone: string; opening: Policy; laptopAccess: Policy; note: string };
export type PolicyInput = {
  source: string;
  coverageSource: string;
  through: string;
  weekly: Partial<Record<Weekday, string>>;
  exceptions: { date: string; windows: string }[];
  maxMinutes: string;
};
export type SessionHoursInput = { timeZone: string; note: string; opening: PolicyInput; laptopAccess: PolicyInput };

function minute(value: string) {
  const [hour, remainder] = value.split(":").map(Number);
  return hour <= 24 && remainder < 60 && (hour < 24 || remainder === 0) ? hour * 60 + remainder : NaN;
}

export function parseWindows(value: string): NonNullable<VerifiedHours["weekly"]["Mon"]> | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.toLowerCase() === "closed") return [];
  const windows = trimmed.split(",").map((part) => {
    const match = part.trim().match(/^(\d{2}:\d{2})\s*[-\u2013]\s*(\d{2}:\d{2})$/);
    if (!match) throw new Error("Use HH:MM-HH:MM, or Closed.");
    const start = minute(match[1]);
    const end = minute(match[2]);
    if (!(start < end)) throw new Error("End must be after start. Split overnight hours at 24:00.");
    return [start, end] as const;
  }).sort((a, b) => a[0] - b[0]);
  if (windows.length > 8 || windows.some(([start], i) => i > 0 && windows[i - 1][1] > start)) {
    throw new Error("Use up to eight non-overlapping windows.");
  }
  return windows;
}

function validDate(value: string) {
  return /^20\d{2}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value;
}

function sourceLink(value: string) {
  if (!value) return value;
  const url = URL.canParse(value) ? new URL(value) : null;
  if (!url || url.protocol !== "https:" || url.username || url.password || /\s/.test(value) || url.href.length > 500) {
    throw new Error("Use a public HTTPS source link.");
  }
  return url.href;
}

function policy(input: PolicyInput, verify: boolean, label: string): Policy {
  try {
    const source = sourceLink(input.source.trim());
    const coverageSource = sourceLink(input.coverageSource.trim());
    if ((verify || input.through) && !validDate(input.through)) throw new Error("Choose a valid coverage date.");
    if (verify && (!source || !coverageSource)) throw new Error("Add the policy and date-exception sources.");
    const weekly = Object.fromEntries(weekdays.flatMap((day) => {
      try {
        const windows = parseWindows(input.weekly[day] ?? "");
        return windows ? [[day, windows]] : [];
      } catch (error) {
        throw new Error(`${day}: ${(error as Error).message}`);
      }
    }));
    const exceptions: Record<string, NonNullable<ReturnType<typeof parseWindows>>> = {};
    for (const { date, windows: raw } of input.exceptions) {
      const windows = parseWindows(raw);
      if (!date && windows === undefined) continue;
      if (!validDate(date) || (verify && date > input.through)) throw new Error("An exception needs a date within the coverage period.");
      if (!windows) throw new Error(`${date}: add hours or mark Closed.`);
      if (Object.hasOwn(exceptions, date)) throw new Error(`${date}: duplicate exception.`);
      exceptions[date] = windows;
    }
    if (Object.keys(exceptions).length > 60) throw new Error("Use up to 60 date exceptions.");
    if (verify && !Object.keys(weekly).length && !Object.keys(exceptions).length) throw new Error("Add at least one known day.");
    const maxSessionMinutes = input.maxMinutes ? Number(input.maxMinutes) : undefined;
    if (maxSessionMinutes !== undefined && (!/^\d+$/.test(input.maxMinutes) || maxSessionMinutes < 1 || maxSessionMinutes > 1440)) {
      throw new Error("Use a whole number of minutes from 1 to 1440.");
    }
    return { source, coverageSource, exceptionsCheckedThrough: input.through, weekly, exceptions,
      ...(maxSessionMinutes !== undefined && { maxSessionMinutes }) };
  } catch (error) {
    throw new Error(`${label}: ${(error as Error).message}`);
  }
}

export function parseSessionHours(input: SessionHoursInput, verify: boolean): SessionHoursPayload {
  const timeZone = input.timeZone.trim();
  if (verify || timeZone) {
    try {
      if (!/^(UTC|[A-Za-z_]+\/[A-Za-z0-9_+/-]+)$/.test(timeZone)) throw new Error();
      new Intl.DateTimeFormat("en", { timeZone });
    } catch {
      throw new Error("Use a venue timezone such as Europe/Zurich or America/New_York.");
    }
  }
  const note = input.note.trim();
  if (Array.from(note).length > 240) throw new Error("Keep the public note to 240 characters.");
  return { timeZone, note, opening: policy(input.opening, verify, "Opening hours"),
    laptopAccess: policy(input.laptopAccess, verify, "Laptop access") };
}

function formatWindows(windows: ReturnType<typeof parseWindows>) {
  if (!windows) return "";
  if (!windows.length) return "Closed";
  const format = (value: number) => `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
  return windows.map(([from, to]) => `${format(from)}-${format(to)}`).join(", ");
}

export function toSessionHoursInput(payload?: SessionHoursPayload | null): SessionHoursInput {
  const toPolicy = (policy?: Policy): PolicyInput => ({
    source: policy?.source ?? "", coverageSource: policy?.coverageSource ?? "",
    through: policy?.exceptionsCheckedThrough ?? "", maxMinutes: String(policy?.maxSessionMinutes ?? ""),
    weekly: Object.fromEntries(weekdays.map((day) => [day, formatWindows(policy?.weekly[day])])),
    exceptions: Object.entries(policy?.exceptions ?? {}).sort().map(([date, windows]) => ({ date, windows: formatWindows(windows) })),
  });
  return { timeZone: payload?.timeZone ?? "", note: payload?.note ?? "",
    opening: toPolicy(payload?.opening), laptopAccess: toPolicy(payload?.laptopAccess) };
}
