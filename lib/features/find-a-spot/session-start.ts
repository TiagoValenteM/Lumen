const LOCAL_MINUTE = /^20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}$/;

export function localSessionInput(instant: Date) {
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${instant.getFullYear()}-${pad(instant.getMonth() + 1)}-${pad(instant.getDate())}T${pad(instant.getHours())}:${pad(instant.getMinutes())}`;
}

export function parseLocalSessionStart(value: string, now: number) {
  const error = "Choose an unambiguous date and time after now.";
  if (!LOCAL_MINUTE.test(value)) return { error };
  const instant = new Date(value);
  const timestamp = instant.getTime();
  if (!Number.isFinite(timestamp) || timestamp < now || localSessionInput(instant) !== value) return { error };

  // Reject both copies of a repeated local time instead of silently choosing an offset.
  const oneDay = 86_400_000;
  const offset = instant.getTimezoneOffset();
  if ([-oneDay, oneDay].some((delta) => {
    const otherOffset = new Date(timestamp + delta).getTimezoneOffset();
    return otherOffset !== offset && localSessionInput(new Date(timestamp + (otherOffset - offset) * 60_000)) === value;
  })) return { error };

  return { start: instant.toISOString().slice(0, 16) + "Z" };
}
