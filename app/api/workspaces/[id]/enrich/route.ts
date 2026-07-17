import { after, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  buildWorkspaceEnrichmentSnapshot,
  enrichWorkspaceWithOpenRouter,
  getPlaceEnrichmentModel,
} from "@/lib/features/workspace-enrichment/openrouter-place-enrichment";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

function isMissingTableError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; message?: string };
  const message = candidate.message?.toLowerCase() ?? "";
  return candidate.code === "42P01" || candidate.code === "PGRST205" || message.includes("workspace_ai_enrichments");
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createClient();
  const requestBody = await request.json().catch(() => null);
  const force = Boolean(requestBody?.force);
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", authData.user.id)
    .maybeSingle();

  const isOwner = workspace.submitted_by === authData.user.id;
  const isAdmin = Boolean(profile?.is_admin);
  if (!isOwner && !isAdmin) {
    console.warn("Workspace enrichment forbidden", { workspaceId: id, userId: authData.user.id });
    return json({ error: "Forbidden" }, 403);
  }
  if (force && !isAdmin) return json({ error: "Only admins can rerun AI enrichment." }, 403);

  if (!force) {
    const { data: existingRun, error: existingRunError } = await supabase
      .from("workspace_ai_enrichments")
      .select("id, status, error_message")
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingRunError) {
      if (isMissingTableError(existingRunError)) {
        console.warn("Workspace enrichment skipped because migration is missing", { workspaceId: id });
        return json({ skipped: true, error: "Run the workspace AI enrichment migration first." }, 202);
      }
      return json({ error: existingRunError.message }, 500);
    }

    if (existingRun) {
      return json({
        ok: existingRun.status !== "failed",
        existing: true,
        enrichmentId: existingRun.id,
        status: existingRun.status,
        error: existingRun.error_message,
      }, existingRun.status === "failed" ? 502 : 200);
    }
  }

  const city = Array.isArray(workspace.city) ? workspace.city[0] : workspace.city;
  const workspaceInput = {
    id: workspace.id,
    name: workspace.name,
    type: workspace.type,
    address: workspace.address,
    city: city?.name ?? null,
    country: city?.country ?? null,
    website: workspace.website,
    phone: workspace.phone,
    description: workspace.description,
    short_description: workspace.short_description,
    latitude: workspace.latitude,
    longitude: workspace.longitude,
  };

  const model = getPlaceEnrichmentModel();
  const { data: run, error: runError } = await supabase
    .from("workspace_ai_enrichments")
    .insert({
      workspace_id: workspace.id,
      requested_by: authData.user.id,
      status: "pending",
      provider: "openrouter",
      model,
      input_snapshot: buildWorkspaceEnrichmentSnapshot(workspaceInput),
    })
    .select("id")
    .single();

  if (runError) {
    if (isMissingTableError(runError)) {
      console.warn("Workspace enrichment skipped because migration is missing", { workspaceId: id });
      return json({ skipped: true, error: "Run the workspace AI enrichment migration first." }, 202);
    }
    console.error("Workspace enrichment could not create run", { workspaceId: id, error: runError.message });
    return json({ error: runError.message }, 500);
  }

  after(async () => {
    await runWorkspaceEnrichment({
      enrichmentId: run.id,
      model,
      supabase,
      workspace,
      workspaceInput,
    });
  });

  console.info("Workspace enrichment queued", { workspaceId: workspace.id, enrichmentId: run.id, model });
  return json({ ok: true, enrichmentId: run.id, status: "pending" }, 202);
}

async function runWorkspaceEnrichment({
  enrichmentId,
  model,
  supabase,
  workspace,
  workspaceInput,
}: {
  enrichmentId: string;
  model: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
  workspace: { id: string };
  workspaceInput: Parameters<typeof enrichWorkspaceWithOpenRouter>[0];
}) {
  try {
    console.info("Workspace enrichment started", { workspaceId: workspace.id, enrichmentId, model });
    const enrichment = await enrichWorkspaceWithOpenRouter(workspaceInput);
    const { error: updateError } = await supabase
      .from("workspace_ai_enrichments")
      .update({
        status: "completed",
        model: enrichment.model,
        suggested_fields: enrichment.result.suggested_fields,
        field_sources: enrichment.result.field_sources,
        citations: enrichment.citations,
        raw_response: enrichment.rawResponse,
        error_message: null,
      })
      .eq("id", enrichmentId);
    if (updateError) throw updateError;

    console.info("Workspace enrichment completed", { workspaceId: workspace.id, enrichmentId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Workspace enrichment failed.";
    console.error("Workspace enrichment failed", { workspaceId: workspace.id, enrichmentId, error: message });
    await supabase
      .from("workspace_ai_enrichments")
      .update({
        status: "failed",
        error_message: message,
      })
      .eq("id", enrichmentId);
  }
}
