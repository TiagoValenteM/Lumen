import { Suspense } from "react";
import { FindSpot } from "./_components/find-spot";

export const metadata = { title: "Find a Spot | Lumen" };

export default function FindPage() {
  const aiEnabled = process.env.FIND_A_SPOT_AI_ENABLED === "true" && Boolean(process.env.OPENROUTER_API_KEY);
  return <Suspense fallback={<p role="status" className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted-foreground sm:px-6">Loading Find a Spot…</p>}><FindSpot aiEnabled={aiEnabled} /></Suspense>;
}
