"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getWorkspaceDirections } from "@/lib/features/locations/directions";
import type { City, WorkspaceDetail } from "@/lib/types";
import { ChevronRight, MapPin, Star } from "lucide-react";

type WorkspaceHeaderProps = {
  city: City;
  workspace: WorkspaceDetail;
  onReviewsClick?: () => void;
  onWriteReview?: () => void;
};

export function WorkspaceHeader({ city, workspace, onReviewsClick, onWriteReview }: WorkspaceHeaderProps) {
  const priceSymbols = workspace.price_range ? "$".repeat(Number(workspace.price_range)) : null;
  const directions = getWorkspaceDirections(workspace);

  return (
    <>
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/cities" className="hover:text-foreground transition-colors">
          Cities
        </Link>
        <ChevronRight className="size-4 shrink-0" aria-hidden="true" />
        <Link href={`/cities/${city.slug}`} className="keyboard-focus min-w-0 py-1 [overflow-wrap:anywhere] hover:text-foreground">
          {city.name}
        </Link>
      </nav>

      <header className="space-y-3 border-b border-border/60 pb-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="capitalize">{workspace.type.replaceAll("_", " ")}</Badge>
              {priceSymbols && <span className="text-sm text-muted-foreground">{priceSymbols}</span>}
            </div>
            <h1 className="text-3xl font-semibold [overflow-wrap:anywhere] md:text-4xl">{workspace.name}</h1>
            {workspace.address && (
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0 [overflow-wrap:anywhere]">{workspace.address}</span>
              </div>
            )}
          </div>
        </div>

        {workspace.overall_rating !== null && (
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="ghost" onClick={onReviewsClick} disabled={!onReviewsClick} className="min-h-11">
              <Star className="size-4 fill-primary text-primary" aria-hidden="true" />
              <span className="font-semibold">{workspace.overall_rating.toFixed(1)}</span>
              <span className="text-muted-foreground">
                ({workspace.total_reviews} {workspace.total_reviews === 1 ? "review" : "reviews"})
              </span>
            </Button>
            {workspace.productivity_rating && (
              <div className="text-sm">
                <span className="text-muted-foreground">Productivity </span>
                <span className="font-semibold">{workspace.productivity_rating.toFixed(1)}</span>
              </div>
            )}
            {workspace.comfort_rating && (
              <div className="text-sm">
                <span className="text-muted-foreground">Comfort </span>
                <span className="font-semibold">{workspace.comfort_rating.toFixed(1)}</span>
              </div>
            )}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {directions && <Button asChild className="min-h-11">
            <a href={directions} target="_blank" rel="noopener noreferrer"><MapPin aria-hidden="true" />Get directions</a>
          </Button>}
          <Button type="button" variant="outline" className="min-h-11" onClick={onWriteReview} disabled={!onWriteReview}>Write review</Button>
        </div>
      </header>
    </>
  );
}
