export const ACTIVITIES = ["general", "focus", "call"] as const;
export const DURATIONS = [60, 120, 180] as const;
export const MAX_REQUEST_LENGTH = 240;
export const SPOT_RADII = [1, 3, 5, 10] as const;

export type SpotPreferences = {
  activity: (typeof ACTIVITIES)[number];
  minutes: (typeof DURATIONS)[number];
  wifi: boolean;
  power: boolean;
};

export type SpotInterpretation = {
  [K in keyof SpotPreferences]: SpotPreferences[K] | null;
} & { unsupported: boolean };

export type SpotSearch = SpotPreferences & {
  city: string;
  radiusKm: (typeof SPOT_RADII)[number] | null;
};

export const DEFAULT_PREFERENCES: SpotPreferences = {
  activity: "general", minutes: 120, wifi: false, power: false,
};

export const interpretationSchema = {
  type: "object",
  additionalProperties: false,
  required: ["activity", "minutes", "wifi", "power", "unsupported"],
  properties: {
    activity: { type: ["string", "null"], enum: [...ACTIVITIES, null] },
    minutes: { type: ["integer", "null"], enum: [...DURATIONS, null] },
    wifi: { type: ["boolean", "null"] },
    power: { type: ["boolean", "null"] },
    unsupported: { type: "boolean" },
  },
};

export function validateInterpretation(value: unknown): SpotInterpretation | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const { activity, minutes, wifi, power, unsupported } = value as Record<string, unknown>;
  if (Object.keys(value).length !== 5 ||
    (activity !== null && !ACTIVITIES.some((option) => option === activity)) ||
    (minutes !== null && !DURATIONS.some((option) => option === minutes)) ||
    (wifi !== null && typeof wifi !== "boolean") ||
    (power !== null && typeof power !== "boolean") || typeof unsupported !== "boolean") return null;
  return value as SpotInterpretation;
}

export function hasInterpretedPreferences({ activity, minutes, wifi, power }: SpotInterpretation) {
  return activity !== null || minutes !== null || wifi !== null || power !== null;
}

export function applyInterpretation(current: SpotPreferences, result: SpotInterpretation): SpotPreferences {
  return {
    activity: result.activity ?? current.activity,
    minutes: result.minutes ?? current.minutes,
    wifi: result.wifi ?? current.wifi,
    power: result.power ?? current.power,
  };
}

export function interpretLocally(text: string): SpotInterpretation {
  const result: SpotInterpretation = { activity: null, minutes: null, wifi: null, power: null, unsupported: false };
  let rest = text.toLowerCase().replace(/[\u2010-\u2014]/g, "-").replace(/\bwi[ -]?fi\b/g, "wifi");
  const take = (pattern: RegExp) => {
    const matches = Array.from(rest.matchAll(pattern));
    rest = rest.replace(pattern, " ");
    return matches;
  };
  // Remove explicit non-requirements before matching positive amenity mentions.
  const wifiOptional = take(/\b(?:no need for|do not need|don['’]t need) wifi\b|\bwifi (?:is )?optional\b/g).length > 0;
  const powerOptional = take(/\b(?:no need for|do not need|don['’]t need) (?:power(?: outlets?)?|outlets?|sockets?)\b|\b(?:power|outlets?|sockets?) (?:is |are )?optional\b/g).length > 0;
  const wifiRequired = take(/\bwifi\b/g).length > 0;
  const powerRequired = take(/\b(?:power outlets?|outlets?|sockets?|power)\b/g).length > 0;
  if ((wifiOptional && wifiRequired) || (powerOptional && powerRequired)) result.unsupported = true;
  else {
    result.wifi = wifiRequired ? true : wifiOptional ? false : null;
    result.power = powerRequired ? true : powerOptional ? false : null;
  }

  const focus = take(/\b(?:quiet|focus(?:ed)?|deep work|stud(?:y|ying))\b/g).length > 0;
  const call = take(/\b(?:(?:video|zoom|phone) calls?|calls?)\b/g).length > 0;
  const general = take(/\b(?:general work|casual work)\b/g).length > 0 || (!focus && !call && /\bwork\b/.test(rest));
  if (Number(focus) + Number(call) + Number(general) > 1) result.unsupported = true;
  else result.activity = call ? "call" : focus ? "focus" : general ? "general" : null;

  const duration = take(/\b(1|2|3|one|two|three|an|60|120|180)[ -]?(hours?|hrs?|h|minutes?|mins?)\b/g);
  if (duration.length === 1) {
    const [, amount, unit] = duration[0];
    const number = { one: 1, an: 1, two: 2, three: 3 }[amount] ?? Number(amount);
    const minutes = unit.startsWith("h") ? number * 60 : number;
    result.minutes = DURATIONS.find((value) => value === minutes) ?? null;
  }
  if (duration.length && !result.minutes) result.unsupported = true;

  rest = rest.replace(/\b(?:i|we|my|me|want|need|please|find|show|looking|look|for|a|an|the|some|somewhere|place|spot|to|do|get|work|take|have|with|and|can|could|use|would|like|require|laptop|on)\b/g, "");
  if (/[\p{L}\p{N}]/u.test(rest)) result.unsupported = true;
  return result;
}

export function canSendRequest(text: string) {
  // This is a guard for obvious sensitive input, not a substitute for user consent.
  return text.trim().length > 0 && text.length <= MAX_REQUEST_LENGTH &&
    !/(?:https?:|www\.|@|\b(?:sk-|api[_ -]?key|password|bearer\b)|\b\d{6,}\b|[-+]?\d{1,3}\.\d{3,})/i.test(text);
}

export function parseSpotSearch(params: Pick<URLSearchParams, "get">): SpotSearch {
  const city = params.get("city") ?? "";
  const activity = params.get("activity");
  const minutes = Number(params.get("minutes"));
  const radius = Number(params.get("radius"));
  return {
    city: /^[a-z0-9-]{1,120}$/.test(city) ? city : "",
    activity: ACTIVITIES.find((value) => value === activity) ?? DEFAULT_PREFERENCES.activity,
    minutes: DURATIONS.find((value) => value === minutes) ?? DEFAULT_PREFERENCES.minutes,
    wifi: params.get("wifi") === "1",
    power: params.get("power") === "1",
    radiusKm: SPOT_RADII.find((value) => value === radius) ?? null,
  };
}

export function spotSearchHref(search: SpotSearch) {
  const params = new URLSearchParams();
  if (search.city) params.set("city", search.city);
  if (search.activity !== DEFAULT_PREFERENCES.activity) params.set("activity", search.activity);
  if (search.minutes !== DEFAULT_PREFERENCES.minutes) params.set("minutes", String(search.minutes));
  if (search.wifi) params.set("wifi", "1");
  if (search.power) params.set("power", "1");
  if (search.radiusKm !== null) params.set("radius", String(search.radiusKm));
  return params.size ? `/find?${params}` : "/find";
}
