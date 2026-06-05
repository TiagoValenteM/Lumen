"use client";

import type { RefObject } from "react";
import { Map as MapIcon } from "lucide-react";

type CityMapSectionProps = {
  mapContainerRef: RefObject<HTMLDivElement | null>;
  placesWithCoordinates: number;
};

export function CityMapSection({ mapContainerRef, placesWithCoordinates }: CityMapSectionProps) {
  return (
    <div className="mb-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-3 text-2xl font-semibold">
          <MapIcon className="h-8 w-8" />
          Map
        </h2>
        <span className="text-sm text-muted-foreground">
          {placesWithCoordinates} mapped {placesWithCoordinates === 1 ? "place" : "places"}
        </span>
      </div>
      <div className="h-[420px] overflow-hidden rounded-lg border border-border bg-card">
        <div ref={mapContainerRef} className="h-full w-full" />
      </div>
    </div>
  );
}
