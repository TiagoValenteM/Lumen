"use client";

import { useEffect, useState } from "react";
import { Clock3, ShieldCheck } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseSessionHours, toSessionHoursInput, type SessionHoursInput } from "@/lib/features/session-hours/editor";
import { readSessionHours, updateSessionHours, type HoursAction, type PlaceSnapshot,
  type SessionHoursRecord } from "@/lib/features/session-hours/repository";
import { SessionPolicyFields } from "./session-policy-fields";

type Props = { client: SupabaseClient; workspaceId: string; place: PlaceSnapshot; isApproved: boolean; blocked: boolean };

function message(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "code" in error) {
    if (error.code === "PGRST202") return "The session-hours database update is not available yet.";
    if ((error.code === "22023" || error.code === "40001") && "message" in error) return String(error.message);
  }
  return "Could not load or save session hours.";
}

export function SessionHoursEditor(props: Props) {
  const [visibility, setVisibility] = useState<"unopened" | "open" | "collapsed">("unopened");
  const [reload, setReload] = useState(0);
  const expanded = visibility === "open";
  const { workspaceId, place } = props;
  return (
    <section aria-labelledby="session-hours-title" className="space-y-3 border-y border-border/60 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="session-hours-title" className="flex items-center gap-2 font-semibold"><Clock3 aria-hidden="true" className="size-4" /> Session hours</h2>
        <Button type="button" size="sm" variant="outline" aria-expanded={expanded} aria-controls={expanded ? "session-hours-editor" : undefined}
          onClick={() => setVisibility(expanded ? "collapsed" : "open")}>{expanded ? "Hide hours editor" : "Edit hours"}</Button>
      </div>
      <div id="session-hours-editor" hidden={!expanded}>
        {visibility !== "unopened" && <Editor key={JSON.stringify([workspaceId, place, props.isApproved, reload])}
          {...props} onReload={() => setReload((value) => value + 1)} />}
      </div>
    </section>
  );
}

function Editor({ client, workspaceId, place, isApproved, blocked, onReload }: Props & { onReload: () => void }) {
  const [record, setRecord] = useState<SessionHoursRecord>();
  const [input, setInput] = useState(toSessionHoursInput);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    void readSessionHours(client, workspaceId, controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      setRecord(result);
      setInput(toSessionHoursInput(result.draft));
    }, (reason) => {
      if (!controller.signal.aborted) setError(message(reason));
    });
    return () => controller.abort();
  }, [client, workspaceId]);
  const patch = (next: Partial<SessionHoursInput>) => {
    setInput((previous) => ({ ...previous, ...next }));
    setConfirm(false);
    setStatus("");
  };
  async function save(action: HoursAction) {
    if (!record || busy || (action !== "withdraw" && blocked) || (action === "verify" && (!isApproved || !confirm))) return;
    setError("");
    setStatus("");
    setBusy(true);
    try {
      const payload = action === "withdraw" ? null : parseSessionHours(input, action === "verify");
      setRecord(await updateSessionHours(client, workspaceId, record.revision, place, action, payload));
      setConfirm(false);
      setStatus(action === "verify" ? "Hours verified and published." : action === "withdraw" ? "Public verification withdrawn." : "Draft saved. Public hours were not changed.");
    } catch (reason) {
      setError(message(reason));
    } finally {
      setBusy(false);
    }
  }
  if (!record) return error ? <div className="space-y-2"><p role="alert" className="text-sm text-destructive">{error}</p>
    <Button type="button" size="sm" variant="outline" onClick={onReload}>Try again</Button></div>
    : <p role="status" className="text-sm text-muted-foreground">Loading session hours…</p>;
  const coverage = record.published && [record.published.opening.exceptionsCheckedThrough, record.published.laptopAccess.exceptionsCheckedThrough].sort()[0];
  return (
    <form noValidate className="space-y-3" onSubmit={(event) => event.preventDefault()}>
      <p className="text-sm text-muted-foreground">{record.checked_at && coverage
        ? `Last verified ${record.checked_at.slice(0, 10)} · exceptions checked through ${coverage}. Checks expire after 30 days.`
        : "No verified hours are published."}</p>
      <fieldset disabled={busy} className="min-w-0 space-y-2">
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          <label className="block min-w-0 space-y-1 text-sm"><span>Venue timezone</span>
            <Input value={input.timeZone} maxLength={80} placeholder="Europe/Zurich" onChange={(e) => patch({ timeZone: e.target.value })} />
          </label>
          <label className="block min-w-0 space-y-1 text-sm"><span>Public note</span>
            <Input value={input.note} maxLength={240} placeholder="For example, purchase required" onChange={(e) => patch({ note: e.target.value })} />
          </label>
        </div>
        <SessionPolicyFields label="Opening hours" value={input.opening} onChange={(opening) => patch({ opening })} />
        <SessionPolicyFields label="Laptop access" value={input.laptopAccess} onChange={(laptopAccess) => patch({ laptopAccess })} laptop />
        {!isApproved || blocked ? <p className="text-sm text-muted-foreground">
          {blocked ? "Save the place changes before updating hours." : "Publish the place with a verified location before verifying hours."}
        </p> : <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" className="size-4 shrink-0 accent-primary" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} />
          I checked both schedules and date exceptions against the listed sources.
        </label>}
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={blocked} onClick={() => void save("draft")}>Save hours draft</Button>
          <Button type="button" disabled={!confirm || !isApproved || blocked} onClick={() => void save("verify")}><ShieldCheck aria-hidden="true" /> Verify and publish hours</Button>
          {record.published && <Button type="button" variant="outline" onClick={() => void save("withdraw")}>Withdraw verification</Button>}
        </div>
      </fieldset>
      {error && <div className="space-y-1"><p role="alert" className="text-sm text-destructive">{error}</p>
        {error.includes("Reload before") && <Button type="button" variant="link" onClick={onReload}>Reload saved hours</Button>}</div>}
      {(busy || status) && <p role="status" className="text-sm text-muted-foreground">{busy ? "Saving session hours…" : status}</p>}
    </form>
  );
}
