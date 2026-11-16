"use client";

import { useId } from "react";
import { ChevronDown, Headphones, Laptop, Phone, SlidersHorizontal, Wifi, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { DURATIONS, type SpotPreferences } from "@/lib/features/find-a-spot/preferences";
import { SpotSessionFilter } from "./spot-session-filter";

const activities = [
  { value: "general", label: "Work", icon: Laptop },
  { value: "focus", label: "Focus", icon: Headphones },
  { value: "call", label: "Take a call", icon: Phone },
] as const;
const choice = "inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground peer-checked:bg-background peer-checked:text-foreground peer-checked:shadow-sm peer-focus-visible:ring-2 peer-focus-visible:ring-ring";

export function SpotFilterDisclosure({ preferences, radiusKm, sessionStart, sessionExpired, onSessionChange, onChange }: {
  preferences: SpotPreferences;
  radiusKm: number | null;
  sessionStart: string | null;
  sessionExpired: boolean;
  onSessionChange: (start: string | null) => void;
  onChange: (preferences: Partial<SpotPreferences>) => void;
}) {
  const summary = [
    activities.find(({ value }) => value === preferences.activity)?.label,
    `${preferences.minutes / 60} h`,
    preferences.wifi && "Wi-Fi",
    preferences.power && "Outlets",
    radiusKm !== null && `${radiusKm} km`,
    sessionStart && "Session hours",
  ].filter(Boolean).join(" · ");

  return (
    <details className="group rounded-lg">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-sm text-secondary-foreground group-open:rounded-b-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
        <SlidersHorizontal className="size-4 shrink-0" aria-hidden="true" />
        <span className="font-medium">Filters</span>
        <span className="min-w-0 flex-1 text-end">{summary}</span>
        <ChevronDown className="size-4 shrink-0 group-open:rotate-180 motion-safe:transition-transform" aria-hidden="true" />
      </summary>
      <div className="space-y-2 rounded-b-lg bg-muted/40 px-3 py-3">
        <SpotFilters preferences={preferences} onChange={onChange} />
        <SpotSessionFilter start={sessionStart} inactive={sessionExpired} onChange={onSessionChange} />
      </div>
    </details>
  );
}

function SpotFilters({ preferences, onChange }: {
  preferences: SpotPreferences;
  onChange: (preferences: Partial<SpotPreferences>) => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-wrap items-start gap-x-3 gap-y-3 sm:gap-x-7">
      <fieldset className="min-w-0">
        <legend className="mb-2 text-sm font-medium">Activity</legend>
        <div className="inline-flex max-w-full flex-wrap gap-0.5 rounded-lg bg-muted/65 p-0.5">
          {activities.map(({ value, label, icon: Icon }) => (
            <label key={value}>
              <input type="radio" name={`${id}-activity`} value={value} className="peer sr-only" checked={preferences.activity === value} onChange={() => onChange({ activity: value })} />
              <span className={choice}><Icon className="size-3.5" aria-hidden="true" />{label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="min-w-0">
        <legend className="mb-2 text-sm font-medium">Duration</legend>
        <div className="inline-flex gap-0.5 rounded-lg bg-muted/65 p-0.5">
          {DURATIONS.map((minutes) => (
            <label key={minutes}>
              <input type="radio" name={`${id}-duration`} value={minutes} className="peer sr-only" checked={preferences.minutes === minutes} onChange={() => onChange({ minutes })} />
              <span className={cn(choice, "min-w-10 sm:min-w-12")}><span aria-hidden="true">{minutes / 60} h</span><span className="sr-only">{minutes / 60} {minutes === 60 ? "hour" : "hours"}</span></span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="min-w-0">
        <legend className="mb-2 text-sm font-medium">Required</legend>
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 sm:gap-x-4">
          {([{ key: "wifi", label: "Wi-Fi", icon: Wifi }, { key: "power", label: "Outlets", icon: Zap }] as const).map(({ key, label, icon: Icon }) => (
            <label key={key} className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 text-sm font-medium">
              <input type="checkbox" checked={preferences[key]} onChange={(event) => onChange({ [key]: event.target.checked })} className="size-4 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" />
              <Icon className="hidden size-3.5 text-muted-foreground sm:block" aria-hidden="true" /> {label}
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
