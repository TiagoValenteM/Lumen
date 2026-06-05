"use client";

import { Button } from "@/components/ui/button";
import { Map as MapIcon, MapPin, SlidersHorizontal } from "lucide-react";

type CityDiscoveryControlsProps = {
  canUseLocationSort: boolean;
  hasMappablePlaces: boolean;
  isClosestSort: boolean;
  showFilters: boolean;
  showMap: boolean;
  onToggleFilters: () => void;
  onToggleMap: () => void;
  onUseNearMe: () => void;
};

export function CityDiscoveryControls({
  canUseLocationSort,
  hasMappablePlaces,
  isClosestSort,
  showFilters,
  showMap,
  onToggleFilters,
  onToggleMap,
  onUseNearMe,
}: CityDiscoveryControlsProps) {
  return (
    <div className="mb-6 flex flex-wrap gap-3">
      {hasMappablePlaces && (
        <Button
          variant={showMap ? "default" : "outline"}
          size="sm"
          className="gap-2"
          onClick={onToggleMap}
        >
          <MapIcon className="h-4 w-4" />
          {showMap ? "Hide map" : "Show map"}
        </Button>
      )}
      <Button
        variant={isClosestSort ? "default" : "outline"}
        size="sm"
        className="gap-2"
        disabled={!canUseLocationSort}
        onClick={onUseNearMe}
      >
        <MapPin className="h-4 w-4" />
        Near me
      </Button>
      <Button
        variant={showFilters ? "default" : "outline"}
        size="sm"
        className="gap-2"
        onClick={onToggleFilters}
      >
        <SlidersHorizontal className="h-4 w-4" />
        {showFilters ? "Hide filters" : "Show filters"}
      </Button>
    </div>
  );
}
