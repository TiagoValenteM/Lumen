import { after, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { readWorkspaceCityProposals } from "@/lib/features/locations/workspace-city-proposals";
import { createServiceClient } from "@/lib/supabase/service";
import {
  buildWorkspaceEnrichmentSnapshot,
  enrichWorkspaceWithOpenRouter,
  getPlaceEnrichmentModel,
  type PlaceEnrichmentMode,
} from "@/lib/features/workspace-enrichment/openrouter-place-enrichment";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export const maxDuration = 120;

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ error: "Unauthorized" }, 401);
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin !== true) return json({ error: "Forbidden" }, 403);
  const service = createServiceClient();
  if (!service) return json({ error: "AI background processing is not configured." }, 503);
  const { error } = await service.rpc("expire_workspace_ai_runs", { workspace_uuid: id });
  if (error) return json({ error: "Could not check AI run expiry." }, 503);
  return json({ ok: true });
}

function normalizeEnrichmentMode(value: unknown): PlaceEnrichmentMode {
  if (value === "no_web" || value === "text_only" || value === "details_only") return value;
  return "full";
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createClient();
  const requestBody = await request.json().catch(() => null);
  const force = requestBody?.force === true;
  const mode = normalizeEnrichmentMode(requestBody?.mode);
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    console.warn("Workspace enrichment unauthorized", { workspaceId: id, error: authError?.message });
    return json({ error: "Unauthorized" }, 401);
  }

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select(`
      id,
      name,
      type,
      address,
      latitude,
      longitude,
      website,
      phone,
      description,
      short_description,
      submitted_by,
      city:cities(name, country)
    `)
    .eq("id", id)
    .maybeSingle();

  if (workspaceError) {
    console.error("Workspace enrichment could not load workspace", { workspaceId: id, error: workspaceError.message });
    return json({ error: workspaceError.message }, 500);
  }
  if (!workspace) {
    console.warn("Workspace enrichment target not found", { workspaceId: id });
    return json({ error: "Workspace not found" }, 404);
  }

  const { data: isAdmin } = await supabase.rpc("is_admin");

  const isOwner = workspace.submitted_by === authData.user.id;
  if (!isOwner && !isAdmin) {
    console.warn("Workspace enrichment forbidden", { workspaceId: id, userId: authData.user.id });
    return json({ error: "Forbidden" }, 403);
  }
  if (force && !isAdmin) return json({ error: "Only admins can rerun AI enrichment." }, 403);

  const service = createServiceClient();
  if (!service || !process.env.OPENROUTER_API_KEY) {
    return json({ error: "AI background processing is not configured." }, 503);
  }

  const city = Array.isArray(workspace.city) ? workspace.city[0] : workspace.city;
  const proposal = city ? null : await readWorkspaceCityProposals(supabase, [workspace.id])
    .then((proposals) => proposals.get(workspace.id))
    .catch((error) => {
      console.warn("Could not read proposed city for AI enrichment", { workspaceId: workspace.id, code: error?.code });
      return null;
    });
  const workspaceInput = {
    id: workspace.id,
    name: workspace.name,
    type: workspace.type,
    address: workspace.address,
    city: city?.name ?? proposal?.name ?? null,
    country: city?.country ?? proposal?.country ?? null,
    website: workspace.website,
    phone: workspace.phone,
    description: workspace.description,
    short_description: workspace.short_description,
    latitude: workspace.latitude,
    longitude: workspace.longitude,
  };

  const model = getPlaceEnrichmentModel();
  const { data: run, error: runError } = await service
    .rpc("enqueue_workspace_ai_run", {
      workspace_uuid: workspace.id,
      requester: authData.user.id,
      rerun: force,
      chosen_model: model,
      chosen_mode: mode,
      snapshot: buildWorkspaceEnrichmentSnapshot(workspaceInput),
    })
    .single();

  if (runError) {
    if (runError.code === "42501") return json({ error: "Forbidden" }, 403);
    if (runError.code === "P0002") return json({ error: "Workspace not found" }, 404);
    console.error("Workspace enrichment could not create run", { workspaceId: id, error: runError.message });
    return json({ error: "Could not start AI research. Check the server configuration and migrations." }, 503);
  }
  const queued = run as { run_id: string; run_status: string; started: boolean };
  if (!queued.started) {
    return json({ ok: true, existing: true, enrichmentId: queued.run_id, status: queued.run_status });
  }

  after(async () => {
    await runWorkspaceEnrichment({
      enrichmentId: queued.run_id,
      model,
      mode,
      supabase: service,
      workspace,
      workspaceInput,
    });
  });

  console.info("Workspace enrichment queued", { workspaceId: workspace.id, enrichmentId: queued.run_id, model, mode });
  return json({ ok: true, enrichmentId: queued.run_id, status: "queued", mode }, 202);
}

async function runWorkspaceEnrichment({
  enrichmentId,
  model,
  mode,
  supabase,
  workspace,
  workspaceInput,
}: {
  enrichmentId: string;
  model: string;
  mode: PlaceEnrichmentMode;
  supabase: NonNullable<ReturnType<typeof createServiceClient>>;
  workspace: { id: string };
  workspaceInput: Parameters<typeof enrichWorkspaceWithOpenRouter>[0];
}) {
  try {
    console.info("Workspace enrichment started", { workspaceId: workspace.id, enrichmentId, model, mode });
    const { data: claimed, error: claimError } = await supabase
      .from("workspace_ai_enrichments")
      .update({
        status: "researching",
        run_metadata: {
          requested_mode: mode,
          researching_at: new Date().toISOString(),
        },
      })
      .eq("id", enrichmentId)
      .eq("status", "queued")
      .select("id")
      .maybeSingle();
    if (claimError) throw claimError;
    if (!claimed) return;

    const enrichment = await enrichWorkspaceWithOpenRouter(workspaceInput, mode);
    const { error: updateError } = await supabase
      .from("workspace_ai_enrichments")
      .update({
        status: "ready_for_review",
        model: enrichment.model,
        suggested_fields: enrichment.result.suggested_fields,
        field_evidence: enrichment.result.field_evidence,
        unknown_fields: enrichment.result.unknown_fields,
        field_sources: enrichment.result.field_sources,
        citations: enrichment.citations,
        raw_response: enrichment.rawResponse,
        error_message: null,
        run_metadata: {
          requested_mode: mode,
          completed_at: new Date().toISOString(),
          confidence: enrichment.result.confidence,
          reviewer_notes: enrichment.result.reviewer_notes,
        },
      })
      .eq("id", enrichmentId)
      .eq("status", "researching");
    if (updateError) throw updateError;

    console.info("Workspace enrichment completed", { workspaceId: workspace.id, enrichmentId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Workspace enrichment failed.";
    console.error("Workspace enrichment failed", { workspaceId: workspace.id, enrichmentId, error: message });
    const { error: failureUpdateError } = await supabase
      .from("workspace_ai_enrichments")
      .update({
        status: "failed",
        error_message: message,
        run_metadata: {
          requested_mode: mode,
          failed_at: new Date().toISOString(),
        },
      })
      .eq("id", enrichmentId)
      .in("status", ["queued", "researching"]);
    if (failureUpdateError) console.error("Could not record AI run failure", { enrichmentId, error: failureUpdateError.message });
  }
}
