"use client";

import Link from "next/link";
import { AlertCircle, ExternalLink, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { WorkspaceDuplicateCandidate } from "../_lib/types";

type DuplicateCandidatesProps = {
  candidates: WorkspaceDuplicateCandidate[];
  loading: boolean;
  error: string | null;
};

export function DuplicateCandidates({ candidates, loading, error }: DuplicateCandidatesProps) {
  if (loading) {
    return (
      <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Checking for existing places nearby...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
        <div className="flex items-start gap-2">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (candidates.length === 0) return null;

  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <div className="space-y-3">
          <div>
            <p className="font-medium">This place might already exist</p>
            <p className="text-sm text-muted-foreground">Check these nearby matches before continuing with a new submission.</p>
          </div>

          <div className="space-y-2">
            {candidates.map((candidate) => (
              <div key={candidate.id} className="rounded-md border bg-background p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{candidate.name}</p>
                      <Badge variant="outline" className="capitalize">
                        {candidate.status.replace("_", " ")}
                      </Badge>
                    </div>
                    {candidate.address && <p className="text-sm text-muted-foreground">{candidate.address}</p>}
                    <p className="text-xs text-muted-foreground">
                      {formatDistance(candidate.distanceMeters)}
                      {candidate.cityName ? ` in ${candidate.cityName}` : ""}
                    </p>
                  </div>
                  {candidate.citySlug && candidate.status === "approved" ? (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/cities/${candidate.citySlug}/${candidate.slug}`} target="_blank">
                        View
                        <ExternalLink className="ml-2 h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  ) : (
                    <p className="text-xs text-muted-foreground">Already awaiting review</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatDistance(distanceMeters: number | null) {
  if (distanceMeters === null) return "Nearby";
  if (distanceMeters < 1000) return `${distanceMeters}m away`;
  return `${(distanceMeters / 1000).toFixed(1)}km away`;
}
