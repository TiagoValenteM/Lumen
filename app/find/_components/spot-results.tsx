"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Map, MapPin, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { hasSpotCoordinates, type SpotCandidate } from "@/lib/features/find-a-spot/matching";
import { cn } from "@/lib/utils";
import { SpotResult } from "./spot-result";

const SpotMap = dynamic(() => import("./spot-map").then((module) => module.SpotMap), {
  ssr: false,
  loading: () => <div role="status" className="grid h-64 place-items-center rounded-lg bg-muted text-sm text-muted-foreground sm:h-80 lg:h-[25rem]">Loading map…</div>,
});
const MATCH_BATCH = 5;
const DETAIL_BATCH = 3;

export function SpotResults({ matches, details, city, scope, limited, now, relaxation, showMap, onToggleMap }: {
  matches: SpotCandidate[];
  details: SpotCandidate[];
  city: string;
  scope: string;
  limited: boolean;
  now: number;
  relaxation?: { label: string; apply: () => void };
  showMap: boolean;
  onToggleMap: () => void;
}) {
  const [pagination, setPagination] = useState({ scope, matches: MATCH_BATCH, details: DETAIL_BATCH });
  const matchLimit = pagination.scope === scope ? pagination.matches : MATCH_BATCH;
  const detailLimit = pagination.scope === scope ? pagination.details : DETAIL_BATCH;
  const mapped = useMemo(() => [
    ...matches.slice(0, matchLimit), ...details.slice(0, detailLimit),
  ].map(({ place }) => place).filter(hasSpotCoordinates), [matches, details, matchLimit, detailLimit]);
  const mapVisible = showMap && mapped.length > 0;
  return (
    <section aria-labelledby="spot-matches" className="border-t border-border/60 pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-2.5">
          <h2 id="spot-matches" className="text-xl font-semibold">Matches</h2>
          <span role="status" className="text-sm tabular-nums text-muted-foreground" aria-label={`${matches.length} matches`}>{matches.length}</span>
        </div>
        {mapped.length > 0 && <Button variant="outline" size="sm" aria-pressed={mapVisible} onClick={onToggleMap}><Map aria-hidden="true" /> {mapVisible ? "Hide map" : "Map"}</Button>}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Opening hours and seat availability aren’t checked here.</p>
      {limited && <p className="mt-1 text-sm text-muted-foreground">This shortlist covers the first 250 listings in this city.</p>}
      <div className={cn("mt-4 grid items-start gap-5", mapVisible && "lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]")}>
        {mapVisible && <div className="lg:sticky lg:top-20 lg:col-start-2 lg:row-start-1">
          <SpotMap places={mapped} />
          <p className="mt-2 text-xs text-muted-foreground">{mapped.length} {mapped.length === 1 ? "listed place" : "listed places"} on the map</p>
        </div>}
        <div className={cn("min-w-0 space-y-6", mapVisible && "lg:col-start-1 lg:row-start-1")}>
          {matches.length > 0 ? (
            <div>
              <ul aria-label="Matching places" className="divide-y divide-border/55">{matches.slice(0, matchLimit).map((candidate) => <SpotResult key={candidate.place.id} candidate={candidate} city={city} now={now} />)}</ul>
              {matches.length > matchLimit && <Button variant="outline" onClick={() => setPagination({ scope, matches: matchLimit + MATCH_BATCH, details: detailLimit })}>Show more matches</Button>}
            </div>
          ) : (
            <div className="flex items-start gap-3 rounded-lg bg-muted/45 px-4 py-4">
              <MapPin className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div className="space-y-2">
                <p className="text-sm font-medium">No places meet all your filters.</p>
                {relaxation && <Button variant="outline" size="sm" onClick={relaxation.apply}><RotateCcw aria-hidden="true" /> {relaxation.label}</Button>}
              </div>
            </div>
          )}
          {details.length > 0 && <section aria-labelledby="spot-to-check" className="border-t border-border/60 pt-4">
            <div className="flex items-baseline gap-2.5"><h2 id="spot-to-check" className="text-lg font-semibold">Details to check</h2><span className="text-sm tabular-nums text-muted-foreground">{details.length}</span></div>
            <ul aria-label="Places with details to check" className="divide-y divide-border/55">{details.slice(0, detailLimit).map((candidate) => <SpotResult key={candidate.place.id} candidate={candidate} city={city} now={now} />)}</ul>
            {details.length > detailLimit && <Button variant="outline" onClick={() => setPagination({ scope, matches: matchLimit, details: detailLimit + DETAIL_BATCH })}>Show more places to check</Button>}
          </section>}
        </div>
      </div>
    </section>
  );
}
