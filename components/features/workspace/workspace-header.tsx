import { Badge } from "@/components/ui/badge";
import { Star, MapPin } from "lucide-react";
import type { WorkspaceDetail, City } from "@/lib/types";

interface WorkspaceHeaderProps {
  workspace: WorkspaceDetail;
  city: City;
  priceSymbols: string | null;
}

export function WorkspaceHeader({ workspace, city, priceSymbols }: WorkspaceHeaderProps) {
  return (
    <div className="mb-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-4xl font-bold mb-2">{workspace.name}</h1>
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>
              {city.name}, {city.country}
            </span>
          </div>
        </div>
        <Badge variant="outline" className="text-base px-4 py-2 capitalize">
          {workspace.type.replace("_", " ")}
        </Badge>
      </div>

      {workspace.short_description && (
        <p className="text-lg text-muted-foreground mb-4">{workspace.short_description}</p>
      )}

      <div className="flex flex-wrap items-center gap-4">
        {workspace.overall_rating !== null && workspace.total_reviews > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Star className="h-5 w-5 fill-primary text-primary" />
              <span className="font-semibold text-lg">{workspace.overall_rating.toFixed(1)}</span>
            </div>
            <span className="text-sm text-muted-foreground">
              ({workspace.total_reviews} {workspace.total_reviews === 1 ? "review" : "reviews"})
            </span>
          </div>
        )}
        {priceSymbols && (
          <div className="text-sm text-muted-foreground">
            <span className="font-semibold">{priceSymbols}</span> Price range
          </div>
        )}
      </div>
    </div>
  );
}
