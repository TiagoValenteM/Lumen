import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WorkspaceImage } from "./workspace-image";
import { Wifi, Zap, Coffee, MapPin, Star } from "lucide-react";

interface WorkspaceCardProps {
  workspace: {
    id: string;
    name: string;
    slug: string;
    type: string;
    short_description: string | null;
    address: string | null;
    has_wifi: boolean;
    has_power_outlets: boolean;
    has_coffee: boolean;
    overall_rating: number | null;
    total_reviews: number;
    primary_photo?: {
      url: string;
    } | null;
  };
  citySlug: string;
}

export function WorkspaceCard({ workspace, citySlug }: WorkspaceCardProps) {
  return (
    <Link href={`/cities/${citySlug}/${workspace.slug}`} className="block h-full">
      <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300 h-full rounded-2xl p-0">
        <div className="relative aspect-video w-full overflow-hidden">
          <WorkspaceImage
            src={workspace.primary_photo?.url}
            alt={workspace.name}
            fill
            className="object-cover hover:scale-105 transition-transform duration-300 rounded-t-2xl"
          />
          <Badge className="absolute top-3 right-3 capitalize">
            {workspace.type.replace('_', ' ')}
          </Badge>
        </div>

        <CardHeader>
          <CardTitle className="line-clamp-1">{workspace.name}</CardTitle>
          {workspace.address && (
            <CardDescription className="flex items-center gap-1 text-xs">
              <MapPin className="h-3 w-3" />
              <span className="line-clamp-1">{workspace.address}</span>
            </CardDescription>
          )}
        </CardHeader>

        <CardContent className="space-y-3">
          {workspace.short_description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {workspace.short_description}
            </p>
          )}

          <div className="flex items-center gap-3 text-sm mb-3">
            {workspace.has_wifi && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Wifi className="h-4 w-4" />
                <span className="text-xs">WiFi</span>
              </div>
            )}
            {workspace.has_power_outlets && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Zap className="h-4 w-4" />
                <span className="text-xs">Power</span>
              </div>
            )}
            {workspace.has_coffee && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Coffee className="h-4 w-4" />
                <span className="text-xs">Coffee</span>
              </div>
            )}
          </div>

          {workspace.overall_rating !== null && workspace.total_reviews > 0 && (
            <div className="flex items-center gap-2 pt-2 pb-2 mt-1 border-t">
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-primary text-primary" />
                <span className="font-semibold">{workspace.overall_rating.toFixed(1)}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                ({workspace.total_reviews} {workspace.total_reviews === 1 ? 'review' : 'reviews'})
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
