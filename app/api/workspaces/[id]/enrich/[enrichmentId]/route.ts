import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string; enrichmentId: string }>;
};

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id, enrichmentId } = await context.params;
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return json({ error: "Unauthorized" }, 401);

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", authData.user.id)
    .maybeSingle();
  if (!profile?.is_admin) return json({ error: "Forbidden" }, 403);

  const body = await request.json().catch(() => null);
  if (body?.status !== "dismissed" && body?.status !== "applied") {
    return json({ error: "Unsupported enrichment status" }, 400);
  }

  const { error } = await supabase
    .from("workspace_ai_enrichments")
    .update({
      status: body.status,
      error_message: null,
    })
    .eq("id", enrichmentId)
    .eq("workspace_id", id);

  if (error) return json({ error: error.message }, 500);
  return json({ ok: true });
}
