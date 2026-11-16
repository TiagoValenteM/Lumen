export type SessionAvailability = "fits" | "does_not_fit" | "unknown";

type Day = "Sun" | "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat";
type MinuteWindow = readonly [start: number, end: number];
type Windows = readonly MinuteWindow[];

export type VerifiedHours = {
  source: string;
  checkedAt: string;
  exceptionsCheckedThrough: string;
  weekly: Partial<Record<Day, Windows>>;
  exceptions: Readonly<Record<string, Windows>>;
};

export type VenueSessionSchedule = {
  timeZone: string;
  opening: VerifiedHours | null;
  laptopAccess: VerifiedHours | null;
};

const MINUTE = 60_000;
const MAX_CHECK_AGE = 30 * 24 * 60 * MINUTE;
const MAX_SESSION_MINUTES = 180;
const days = new Set<string>(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);

type LocalMinute = { date: string; day: Day; minute: number };

function isCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const instant = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(instant.getTime()) && instant.toISOString().startsWith(value);
}

function coversMinute(windows: Windows | undefined, minute: number) {
  if (!Array.isArray(windows) || windows.some((window) => !Array.isArray(window) || window.length !== 2 ||
    !Number.isInteger(window[0]) || !Number.isInteger(window[1]) || window[0] < 0 ||
    window[1] > 1440 || window[0] >= window[1])) return undefined;

  return windows.some(([start, end]) => start <= minute && minute < end);
}

function checkHours(hours: VerifiedHours | null, minutes: LocalMinute[], now: number): SessionAvailability {
  const checked = Date.parse(hours?.checkedAt ?? "");
  if (!hours?.source.trim() || !Number.isFinite(checked) || checked > now ||
    now - checked > MAX_CHECK_AGE || !isCalendarDate(hours.exceptionsCheckedThrough)) return "unknown";

  let unknown = false;
  for (const { day, date, minute } of minutes) {
    if (date > hours.exceptionsCheckedThrough) {
      unknown = true;
      continue;
    }
    const windows = Object.hasOwn(hours.exceptions, date) ? hours.exceptions[date] : hours.weekly[day];
    const covered = coversMinute(windows, minute);
    if (covered === false) return "does_not_fit";
    if (covered === undefined) unknown = true;
  }
  return unknown ? "unknown" : "fits";
}

export function createSessionAvailability({ startAt, durationMinutes, now }: {
  startAt: number;
  durationMinutes: number;
  now: number;
}) {
  const endAt = startAt + durationMinutes * MINUTE;
  const valid = Number.isSafeInteger(startAt) && Number.isSafeInteger(now) && startAt >= now &&
    Number.isInteger(durationMinutes) && durationMinutes > 0 && durationMinutes <= MAX_SESSION_MINUTES &&
    Number.isFinite(new Date(endAt).getTime());
  const projected = new Map<string, LocalMinute[] | null>();

  function localMinutes(timeZone: string) {
    if (projected.has(timeZone)) return projected.get(timeZone);
    let result: LocalMinute[] | null = [];
    try {
      const format = new Intl.DateTimeFormat("en-US", {
        timeZone, calendar: "gregory", numberingSystem: "latn", hourCycle: "h23",
        weekday: "short", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
      });
      // Follow real elapsed time, including both copies of a repeated hour.
      for (let instant = Math.floor(startAt / MINUTE) * MINUTE; instant < endAt; instant += MINUTE) {
        const parts = Object.fromEntries(format.formatToParts(instant).map(({ type, value }) => [type, value]));
        if (!days.has(parts.weekday)) throw new RangeError("Unknown local weekday");
        result.push({ date: `${parts.year}-${parts.month}-${parts.day}`, day: parts.weekday as Day, minute: Number(parts.hour) * 60 + Number(parts.minute) });
      }
    } catch {
      result = null;
    }
    projected.set(timeZone, result);
    return result;
  }

  return (schedule: VenueSessionSchedule | null | undefined): SessionAvailability => {
    const timeZone = schedule?.timeZone;
    if (!valid || !schedule || !timeZone || /^[+-]/.test(timeZone)) return "unknown";
    const minutes = localMinutes(timeZone);
    if (!minutes?.length) return "unknown";

    const opening = checkHours(schedule.opening, minutes, now);
    const laptop = checkHours(schedule.laptopAccess, minutes, now);
    if (opening === "does_not_fit" || laptop === "does_not_fit") return "does_not_fit";
    return opening === "fits" && laptop === "fits" ? "fits" : "unknown";
  };
}
