import { Suspense } from "react";
import type { Metadata } from "next";
import { BRAND_OPEN_GRAPH } from "@/lib/constants/brand";
import { FindSpot } from "./_components/find-spot";

export const metadata: Metadata = {
  title: "Find a Spot",
  description: "Find a place for your next work session. Filter by Wi-Fi, outlets, activity, and how long you need to stay.",
  alternates: { canonical: "/find" },
  openGraph: { ...BRAND_OPEN_GRAPH, url: "/find" },
};

export default function FindPage() {
  const aiEnabled = process.env.FIND_A_SPOT_AI_ENABLED === "true" && Boolean(process.env.OPENROUTER_API_KEY);
  return <Suspense fallback={<p role="status" className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted-foreground sm:px-6">Loading Find a Spot…</p>}><FindSpot aiEnabled={aiEnabled} /></Suspense>;
}
