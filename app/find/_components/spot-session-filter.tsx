"use client";

import { useId, useState } from "react";
import { CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { localSessionInput, parseLocalSessionStart } from "@/lib/features/find-a-spot/session-start";

export function SpotSessionFilter({ start, inactive, onChange }: {
  start: string | null;
  inactive: boolean;
  onChange: (start: string | null) => void;
}) {
  const id = useId();
  const fixed = start && start !== "now" ? start : null;
  return (
    <fieldset className="min-w-0 space-y-1.5">
      <legend className="sr-only">Session hours</legend>
      <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium">
        <input type="checkbox" checked={start !== null} onChange={(event) => onChange(event.target.checked ? "now" : null)}
          className="size-4 shrink-0 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" />
        <CalendarClock aria-hidden="true" className="hidden size-4 text-muted-foreground sm:block" />
        Open for my session
      </label>
      {start && <SessionStartForm key={start} id={id} fixed={fixed} inactive={inactive} onChange={onChange} />}
    </fieldset>
  );
}

function SessionStartForm({ id, fixed, inactive, onChange }: {
  id: string;
  fixed: string | null;
  inactive: boolean;
  onChange: (start: string) => void;
}) {
  const [value, setValue] = useState(() => fixed ? localSessionInput(new Date(fixed)) : "");
  const [error, setError] = useState("");
  return (
    <form noValidate className="space-y-1.5" onSubmit={(event) => {
      event.preventDefault();
      const result = parseLocalSessionStart(value, Date.now());
      if (result.error) setError(result.error);
      else if (result.start) { setError(""); onChange(result.start); }
    }}>
      <label htmlFor={id} className="block text-xs font-medium">
        {fixed ? "Session start (your local time)" : "Starting now. Plan a different start (your local time)"}
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <Input id={id} value={value} type="datetime-local" className="h-11 max-w-full sm:w-auto"
          aria-invalid={Boolean(error || inactive)} aria-describedby={error || inactive ? `${id}-error` : undefined}
          onChange={(event) => { setValue(event.target.value); setError(""); }} />
        <Button type="submit" variant="outline" className="min-h-11">Set start</Button>
        {fixed && <Button type="button" variant="ghost" className="min-h-11" onClick={() => onChange("now")}>Start now</Button>}
      </div>
      {(error || inactive) && <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
        {error || "This start has passed. Choose a new time or start now."}
      </p>}
    </form>
  );
}
