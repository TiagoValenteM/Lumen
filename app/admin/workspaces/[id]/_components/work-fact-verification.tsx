"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { readWorkFactChecks } from "@/lib/features/workspaces/work-fact-checks";
import { getWorkFacts } from "@/lib/features/workspaces/work-facts";
import type { AdminWorkspaceFormState, WorkspaceDetailMinimal } from "../_lib/types";

export function WorkFactVerification({ supabase, workspace, form, busy }: {
  supabase: SupabaseClient;
  workspace: WorkspaceDetailMinimal;
  form: AdminWorkspaceFormState;
  busy: boolean;
}) {
  const [check, setCheck] = useState<{ key: string; date: string | null } | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const facts = getWorkFacts(workspace);
  const snapshot = {
    ...facts, name: workspace.name, address: workspace.address,
    latitude: workspace.latitude, longitude: workspace.longitude, city_id: workspace.city_id,
  };
  const key = JSON.stringify([workspace.id, workspace.status, snapshot]);
  const changed = JSON.stringify(getWorkFacts(form)) !== JSON.stringify(facts)
    || form.name !== workspace.name || form.address !== (workspace.address ?? "")
    || form.latitude !== workspace.latitude || form.longitude !== workspace.longitude
    || form.city_name !== (workspace.city_name ?? "") || form.country !== (workspace.country ?? "")
    || form.status !== workspace.status;
  const published = workspace.status === "approved";
  const hasFacts = Object.values(facts).some((value) => value !== null);
  const checkedAt = check?.key === key ? check.date : null;
  const workspaceId = workspace.id;

  useEffect(() => {
    if (!published) return;
    let current = true;
    void readWorkFactChecks(supabase, { workspaceId }).then((checks) => {
      if (current) setCheck({ key, date: checks.get(workspaceId) ?? null });
    });
    return () => { current = false; };
  }, [key, published, supabase, workspaceId]);

  const recordCheck = async () => {
    setChecking(true);
    setError(null);
    try {
      const { data, error: checkError } = await supabase.rpc("check_workspace_work_facts", {
        workspace_uuid: workspaceId,
        expected_snapshot: snapshot,
      });
      if (checkError || typeof data !== "string") {
        setError(checkError?.code === "22023" ? checkError.message : "Could not record the work-fact check.");
        return;
      }
      setCheck({ key, date: data });
    } catch {
      setError("Could not record the work-fact check.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
      <div className="min-w-0 text-sm">
        <p className="font-medium">Work-fact check</p>
        <p role="status" className="text-muted-foreground">
          {changed ? "Unsaved work facts or location"
            : !published ? "Available after publication"
            : check?.key !== key ? "Loading check"
            : checkedAt ? `Checked ${new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(checkedAt))}`
            : "Not yet checked"}
        </p>
        {error && <p role="alert" className="text-destructive">{error}</p>}
      </div>
      <Button type="button" variant="outline" size="sm" disabled={busy || checking || changed || !published || !hasFacts || check?.key !== key}
        onClick={recordCheck}>
        <ShieldCheck aria-hidden="true" />
        {checking ? "Recording..." : "Mark known facts checked"}
      </Button>
    </div>
  );
}
