"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { City, WorkspaceDetail } from "@/lib/types";
import { ChevronRight, MapPin, Star } from "lucide-react";

type WorkspaceHeaderProps = {
  city: City;
  workspace: WorkspaceDetail;
  onReviewsClick?: () => void;
};

export function WorkspaceHeader({ city, workspace, onReviewsClick }: WorkspaceHeaderProps) {
  const priceSymbols = workspace.price_range ? "$".repeat(Number(workspace.price_range)) : null;

  return (
    <>
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link href="/cities" className="hover:text-foreground transition-colors">
          Cities
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link href={`/cities/${city.slug}`} className="hover:text-foreground transition-colors">
          {city.name}
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">{workspace.name}</span>
      </nav>

      <div className="mb-8 space-y-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight md:text-5xl">{workspace.name}</h1>
              <Badge className="capitalize">{workspace.type.replace("_", " ")}</Badge>
            </div>
            {workspace.address && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{workspace.address}</span>
              </div>
            )}
          </div>
          {priceSymbols && <div className="flex items-center gap-1 text-2xl">{priceSymbols}</div>}
        </div>

        {workspace.overall_rating !== null && (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onReviewsClick}
              className="flex items-center gap-2 rounded-xl border border-border/35 bg-card/70 px-3 py-2 text-left shadow-sm shadow-black/5 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45 dark:shadow-black/20"
            >
              <Star className="h-5 w-5 fill-primary text-primary" />
              <span className="text-2xl font-bold">{workspace.overall_rating.toFixed(1)}</span>
              <span className="text-muted-foreground">
                ({workspace.total_reviews} {workspace.total_reviews === 1 ? "review" : "reviews"})
              </span>
            </button>
            {workspace.productivity_rating && (
              <div className="rounded-xl border border-border/35 bg-card/70 px-3 py-2 text-sm shadow-sm shadow-black/5 dark:shadow-black/20">
                <span className="text-muted-foreground">Productivity </span>
                <span className="font-semibold">{workspace.productivity_rating.toFixed(1)}</span>
              </div>
            )}
            {workspace.comfort_rating && (
              <div className="rounded-xl border border-border/35 bg-card/70 px-3 py-2 text-sm shadow-sm shadow-black/5 dark:shadow-black/20">
                <span className="text-muted-foreground">Comfort </span>
                <span className="font-semibold">{workspace.comfort_rating.toFixed(1)}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
