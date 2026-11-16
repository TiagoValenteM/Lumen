"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Map, RotateCcw } from "lucide-react";
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

export function SpotResults({ matches, details, city, scope, limited, now, sessionHours, relaxation, showMap, onToggleMap }: {
  matches: SpotCandidate[];
  details: SpotCandidate[];
  city: string;
  scope: string;
  limited: boolean;
  now: number;
  sessionHours: boolean;
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
  const hasMatches = matches.length > 0;
  const hasDetails = details.length > 0;
  const count = hasMatches ? matches.length : details.length;

  return (
    <section aria-labelledby="spot-results" className="border-t border-border/60 pt-3 sm:pt-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <h2 id="spot-results" className="text-xl font-semibold">{hasMatches ? "Matches" : hasDetails ? "Places to check" : "No matches"}</h2>
            {count > 0 && <span className="text-sm tabular-nums text-muted-foreground" aria-hidden="true">{count}</span>}
          </div>
          <p role="status" className="text-sm text-muted-foreground">
            {hasMatches ? <span className="sr-only">{count} confirmed {count === 1 ? "match" : "matches"}.</span>
              : hasDetails ? <>No confirmed matches.<span className="sr-only"> {count} {count === 1 ? "place" : "places"} to check.</span></>
              : "No places meet all your filters."}
          </p>
        </div>
        {mapped.length > 0 && <Button type="button" variant="outline" size="sm" className="min-h-11"
          aria-expanded={mapVisible} aria-controls={mapVisible ? "spot-results-map" : undefined} onClick={onToggleMap}>
          <Map aria-hidden="true" /> {mapVisible ? "Hide map" : "Map"}
        </Button>}
      </div>
      {limited && <p className="mt-1 text-sm text-muted-foreground">This shortlist covers the first 250 listings in this city.</p>}
      <div className={cn("mt-2 grid items-start gap-4", mapVisible && "lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]")}>
        {mapVisible && <div id="spot-results-map" className="lg:sticky lg:top-20 lg:col-start-2 lg:row-start-1">
          <SpotMap places={mapped} />
          <p className="mt-2 text-xs text-muted-foreground">{mapped.length} {mapped.length === 1 ? "listed place" : "listed places"} on the map</p>
        </div>}
        <div className={cn("min-w-0 space-y-4", mapVisible && "lg:col-start-1 lg:row-start-1")}>
          {hasMatches && (
            <div>
              <ul aria-label="Matching places" className="divide-y divide-border/55">{matches.slice(0, matchLimit).map((candidate) => <SpotResult key={candidate.place.id} candidate={candidate} city={city} now={now} />)}</ul>
              {matches.length > matchLimit && <Button variant="outline" className="min-h-11" onClick={() => setPagination({ scope, matches: matchLimit + MATCH_BATCH, details: detailLimit })}>Show more matches</Button>}
            </div>
          )}
          {hasDetails && <div className={hasMatches ? "border-t border-border/60 pt-4" : undefined}>
            {hasMatches && <div className="flex items-baseline gap-2"><h3 className="text-lg font-semibold">Places to check</h3><span className="text-sm tabular-nums text-muted-foreground">{details.length}</span></div>}
            <ul aria-label="Places with details to check" className="divide-y divide-border/55">{details.slice(0, detailLimit).map((candidate) => <SpotResult key={candidate.place.id} candidate={candidate} city={city} now={now} />)}</ul>
            {details.length > detailLimit && <Button variant="outline" className="min-h-11" onClick={() => setPagination({ scope, matches: matchLimit, details: detailLimit + DETAIL_BATCH })}>Show more places to check</Button>}
          </div>}
          {!hasMatches && relaxation && <Button variant="outline" size="sm" className="min-h-11" onClick={relaxation.apply}><RotateCcw aria-hidden="true" /> {relaxation.label}</Button>}
        </div>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{sessionHours
        ? "Session hours are checked for selected places only. Hours can change and seats are not guaranteed."
        : "Opening hours and seat availability aren’t checked here."}</p>
    </section>
  );
}
