import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { canSendRequest, interpretationSchema, validateInterpretation } from "@/lib/features/find-a-spot/preferences";
import { requestSpotInterpretation } from "@/lib/features/find-a-spot/openrouter";

function failure(status: number) {
  return NextResponse.json({ interpretation: null }, { status, headers: { "Cache-Control": "no-store" } });
}

async function readText(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("application/json")) return null;
  const reader = request.body?.getReader();
  if (!reader) return null;
  const decoder = new TextDecoder();
  let size = 0;
  let body = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 2048) {
        void reader.cancel().catch(() => undefined);
        return null;
      }
      body += decoder.decode(value, { stream: true });
    }
    const parsed = JSON.parse(body + decoder.decode());
    return parsed && Object.keys(parsed).length === 1 && typeof parsed.text === "string" && canSendRequest(parsed.text)
      ? parsed.text.trim() : null;
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (process.env.FIND_A_SPOT_AI_ENABLED !== "true" || !apiKey) return failure(503);
  const text = await readText(request);
  if (!text) return failure(400);

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return failure(401);
    const service = createServiceClient();
    if (!service) return failure(503);
    const { data, error } = await service.rpc("take_spot_interpretation_slot", { requester: user.id });
    if (error || typeof data !== "boolean") return failure(503);
    if (!data) return failure(429);

    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(6500)]);
    const output = await requestSpotInterpretation({ text, schema: interpretationSchema, apiKey, signal });
    const interpretation = validateInterpretation(output);
    if (!interpretation) return failure(502);
    return NextResponse.json({ interpretation }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    // Never include prompts or upstream response bodies in logs or client errors.
    return failure(502);
  }
}
