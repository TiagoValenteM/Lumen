import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string; enrichmentId: string }>;
};

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

function normalizeFieldDecisions(value: unknown) {
  if (value === undefined) return {};
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const entries = Object.entries(value);
  if (entries.length > 100 || entries.some(([path, decision]) => !path || path.length > 100 || decision !== "rejected")) {
    return null;
  }
  return Object.fromEntries(entries);
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id, enrichmentId } = await context.params;
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return json({ error: "Unauthorized" }, 401);

  const body = await request.json().catch(() => null);
  const dismiss = body?.status === "dismissed";
  const decisions = normalizeFieldDecisions(body?.field_decisions);
  if (!decisions || (body?.status !== undefined && !dismiss) || (!dismiss && !Object.keys(decisions).length)) {
    return json({ error: "Unsupported enrichment update" }, 400);
  }

  const { error } = await supabase.rpc("review_workspace_ai_run", {
    workspace_uuid: id, enrichment_uuid: enrichmentId, decisions, dismiss,
  });
  if (error) {
    if (error.code === "42501") return json({ error: "Forbidden" }, 403);
    if (error.code === "P0002") return json({ error: "AI enrichment run not found." }, 404);
    if (error.code === "22023") return json({ error: error.message }, 409);
    console.error("Could not update AI review", { id, enrichmentId, code: error.code });
    return json({ error: "Could not update AI review." }, 500);
  }
  return json({ ok: true });
}
