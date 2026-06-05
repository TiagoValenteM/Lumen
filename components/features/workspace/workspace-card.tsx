import Link from "next/link";
import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getWorkspaceCardVibes, isDeepWorkWorkspace } from "@/lib/features/workspaces/workspace-card-view";
import { WorkspaceImage } from "./workspace-image";
import { Coffee, MapPin, MessageSquare, ShieldCheck, Star, Volume2, Wifi, Zap } from "lucide-react";

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
    noise_level?: string | null;
    music_volume?: number | null;
    time_limit_hours?: number | null;
    good_for_calls?: boolean;
    good_for_meetings?: boolean;
    good_for_groups?: boolean;
    overall_rating: number | null;
    total_reviews: number;
    last_verified_at?: string | null;
    primary_photo?: {
      url: string;
    } | null;
  };
  citySlug: string;
}

export function WorkspaceCard({ workspace, citySlug }: WorkspaceCardProps) {
  const vibeLabels = getWorkspaceCardVibes(workspace);
  const features = getVisibleFeatures(workspace);

  return (
    <Link href={`/cities/${citySlug}/${workspace.slug}`} className="block h-full">
      <Card className="group flex h-full flex-col gap-0 overflow-hidden rounded-lg border-border/70 p-0 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md">
        <div className="relative aspect-video w-full overflow-hidden">
          <WorkspaceImage
            src={workspace.primary_photo?.url}
            alt={workspace.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
            <Badge className="capitalize shadow-sm">{workspace.type.replace("_", " ")}</Badge>
            {workspace.last_verified_at && (
              <Badge variant="secondary" className="gap-1 border border-white/40 bg-background/90 text-foreground shadow-sm backdrop-blur">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                Verified
              </Badge>
            )}
          </div>
        </div>

        <CardHeader className="space-y-3 px-5 pb-3 pt-5">
          <div className="space-y-1">
            <CardTitle className="line-clamp-1">{workspace.name}</CardTitle>
            {workspace.address && (
              <CardDescription className="flex items-center gap-1 text-xs">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="line-clamp-1">{workspace.address}</span>
              </CardDescription>
            )}
          </div>

          <div className="flex min-h-6 flex-nowrap gap-1.5 overflow-hidden">
            {vibeLabels.length > 0 ? (
              vibeLabels.map((label) => (
                <Badge key={label} variant="outline" className="shrink-0 border-primary/20 bg-primary/5 text-[11px] text-foreground">
                  {label}
                </Badge>
              ))
            ) : (
              <span aria-hidden="true" className="h-6" />
            )}
          </div>
        </CardHeader>

        <CardContent className="flex flex-1 flex-col gap-3 px-5 pb-5 pt-0">
          <div className="min-h-[2.75rem]">
            {workspace.short_description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {workspace.short_description}
              </p>
            )}
          </div>

          <div className="min-h-[42px]">
            {features.length > 0 && (
              <div className="flex flex-wrap gap-2 rounded-md border bg-muted/25 p-2 text-muted-foreground">
                {features.map((feature) => (
                  <FeatureIcon key={feature.label} label={feature.label} icon={feature.icon} />
                ))}
              </div>
            )}
          </div>

          {workspace.overall_rating !== null && workspace.total_reviews > 0 && (
            <div className="mt-auto flex items-center justify-between border-t pt-3">
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-primary text-primary" />
                <span className="font-semibold">{workspace.overall_rating.toFixed(1)}</span>
              </div>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <MessageSquare className="h-3.5 w-3.5" />
                {workspace.total_reviews} {workspace.total_reviews === 1 ? "review" : "reviews"}
              </span>
            </div>
          )}

          {workspace.last_verified_at && (
            <p className="border-t pt-2 text-xs text-muted-foreground">
              Verified {new Date(workspace.last_verified_at).toLocaleDateString("en-US", {
                month: "short",
                year: "numeric",
              })}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

function FeatureIcon({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-foreground">
      {icon}
      <span>{label}</span>
    </div>
  );
}

function getVisibleFeatures(workspace: WorkspaceCardProps["workspace"]) {
  const features: { icon: ReactNode; label: string }[] = [];

  if (workspace.has_wifi) features.push({ label: "WiFi", icon: <Wifi className="h-3.5 w-3.5 text-primary" /> });
  if (workspace.has_power_outlets) features.push({ label: "Power", icon: <Zap className="h-3.5 w-3.5 text-primary" /> });
  if (workspace.has_coffee) features.push({ label: "Coffee", icon: <Coffee className="h-3.5 w-3.5 text-primary" /> });
  if (isDeepWorkWorkspace(workspace)) features.push({ label: "Quiet", icon: <Volume2 className="h-3.5 w-3.5 text-primary" /> });

  return features.slice(0, 4);
}
