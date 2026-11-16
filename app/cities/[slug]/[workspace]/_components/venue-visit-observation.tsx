"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { MessageSquarePlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { localSessionInput } from "@/lib/features/find-a-spot/session-start";
import { authHref, VISIT_OBSERVATION_HASH, workspaceObservationPath } from "@/lib/features/auth/return-path";

const choices = {
  doors: [["unknown", "Not sure"], ["open", "Open"], ["closed", "Closed when I arrived"]],
  laptops: [["unknown", "Not sure"], ["allowed", "Allowed"], ["restricted", "Allowed with restrictions"], ["not_allowed", "Not allowed"]],
  stay: [["unknown", "Not sure"], ["limit_seen", "A limit was posted or stated"], ["no_limit_seen", "I did not see a limit"]],
} as const;
const labels = { doors: "Was it open?", laptops: "Were laptops allowed?", stay: "Was there a stay limit?" };

export function VenueVisitObservation({ workspaceId, city, slug, signedIn }: {
  workspaceId: string; city: string; slug: string; signedIn: boolean;
}) {
  const client = useMemo(() => createClient(), []);
  const details = useRef<HTMLDetailsElement>(null);
  const [observed, setObserved] = useState({ doors: "unknown", laptops: "unknown", stay: "unknown" });
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [{ today, earliest }] = useState(() => {
    const now = new Date();
    const today = localSessionInput(now).slice(0, 10);
    now.setDate(now.getDate() - 30);
    return { today, earliest: localSessionInput(now).slice(0, 10) };
  });
  useEffect(() => {
    if (window.location.hash === VISIT_OBSERVATION_HASH && details.current) {
      details.current.open = true;
      details.current.scrollIntoView();
    }
  }, []);
  async function submit() {
    if (busy || !signedIn) return;
    const day = date || today;
    if (day < earliest || day > today || Object.values(observed).every((value) => value === "unknown")) {
      setError("Choose a visit date in the last 30 days and add at least one observation.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { error: rpcError } = await client.rpc("submit_workspace_visit_observation", { workspace_uuid: workspaceId,
        visited_on: day, ...observed });
      if (rpcError) {
        setError(rpcError.code === "23505" ? "You already reported this visit."
          : rpcError.code === "22023" ? rpcError.message : "Could not send the visit report. Try again.");
      } else setSent(true);
    } catch {
      setError("Could not send the visit report. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return <details ref={details} id="visit-observation" className="scroll-mt-24 border-t border-border/60 pt-2">
    <summary className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring">
      <MessageSquarePlus aria-hidden="true" className="size-4" /> Report a recent visit
    </summary>
    {sent ? <p role="status" className="text-sm text-muted-foreground">Report sent for review. Public information has not changed.</p>
      : !signedIn ? <Button asChild variant="outline" size="sm"><Link href={authHref("/login", workspaceObservationPath(city, slug))}>Sign in to report a visit</Link></Button>
      : <form className="space-y-3 pb-2" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <fieldset disabled={busy} className="min-w-0 space-y-3">
          <label className="block min-w-0 space-y-1 text-sm"><span>Visit date</span>
            <Input type="date" value={date || today} min={earliest} max={today} required onChange={(e) => setDate(e.target.value)} />
          </label>
          {(["doors", "laptops", "stay"] as const).filter((key) => key === "doors" || observed.doors !== "closed").map((key) =>
            <label key={key} className="block min-w-0 space-y-1 text-sm"><span>{labels[key]}</span>
              <NativeSelect value={observed[key]} onChange={(e) => setObserved({ ...observed, [key]: e.target.value,
                ...(key === "doors" && e.target.value === "closed" && { laptops: "unknown", stay: "unknown" }) })}>
                {choices[key].map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </NativeSelect>
            </label>)}
          <Button type="submit" size="sm">{busy ? "Sending…" : "Send visit report"}</Button>
        </fieldset>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </form>}
  </details>;
}
