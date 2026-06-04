"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { City, WorkspaceDetail } from "@/lib/types";
import { ChevronRight, MapPin, Star } from "lucide-react";

type WorkspaceHeaderProps = {
  city: City;
  workspace: WorkspaceDetail;
};

export function WorkspaceHeader({ city, workspace }: WorkspaceHeaderProps) {
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

      <div className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl font-bold">{workspace.name}</h1>
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
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 fill-primary text-primary" />
              <span className="text-2xl font-bold">{workspace.overall_rating.toFixed(1)}</span>
              <span className="text-muted-foreground">
                ({workspace.total_reviews} {workspace.total_reviews === 1 ? "review" : "reviews"})
              </span>
            </div>
            {workspace.productivity_rating && (
              <div className="text-sm">
                <span className="text-muted-foreground">Productivity: </span>
                <span className="font-semibold">{workspace.productivity_rating.toFixed(1)}</span>
              </div>
            )}
            {workspace.comfort_rating && (
              <div className="text-sm">
                <span className="text-muted-foreground">Comfort: </span>
                <span className="font-semibold">{workspace.comfort_rating.toFixed(1)}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
