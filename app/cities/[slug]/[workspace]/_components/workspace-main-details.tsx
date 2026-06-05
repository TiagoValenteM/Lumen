"use client";

import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getWorkabilityReport } from "@/lib/features/workspaces/workability-report";
import type { WorkspaceDetail } from "@/lib/types";
import {
  Accessibility,
  Bike,
  BriefcaseBusiness,
  Car,
  CheckCircle2,
  Clock,
  Coffee,
  Info,
  PawPrint,
  Phone,
  ShieldCheck,
  Sprout,
  Sun,
  Users,
  Utensils,
  Volume2,
  Wifi,
  Wind,
  Zap,
} from "lucide-react";

type WorkspaceMainDetailsProps = {
  workspace: WorkspaceDetail;
};

export function WorkspaceMainDetails({ workspace }: WorkspaceMainDetailsProps) {
  const workability = getWorkabilityReport(workspace);

  return (
    <>
      <Card className="rounded-lg">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <CardTitle>Workability Report</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <ScoreBlock
              label="Productivity"
              score={workability.productivityScore}
              icon={<BriefcaseBusiness className="h-4 w-4" />}
            />
            <ScoreBlock
              label="Comfort"
              score={workability.comfortScore}
              icon={<Coffee className="h-4 w-4" />}
            />
          </div>

          {workability.bestFor.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Best for</p>
              <div className="flex flex-wrap gap-2">
                {workability.bestFor.map((item) => (
                  <Badge key={item} variant="secondary">
                    {item}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {workability.notes.length > 0 && (
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Info className="h-4 w-4 text-primary" />
                What to know before going
              </div>
              <div className="grid gap-2">
                {workability.notes.map((note) => (
                  <div key={note} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{note}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {workspace.description && (
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>About</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-line">{workspace.description}</p>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Productivity</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <Wifi className={`h-5 w-5 ${workspace.has_wifi ? "text-primary" : "text-muted-foreground"}`} />
            <div>
              <p className="font-medium">WiFi</p>
              {workspace.wifi_speed && <p className="text-sm text-muted-foreground capitalize">{workspace.wifi_speed}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Zap className={`h-5 w-5 ${workspace.has_power_outlets ? "text-primary" : "text-muted-foreground"}`} />
            <div>
              <p className="font-medium">Power Outlets</p>
              {workspace.power_outlet_availability && (
                <p className="text-sm text-muted-foreground">{workspace.power_outlet_availability}/5 availability</p>
              )}
            </div>
          </div>
          {workspace.seating_capacity && (
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Seating</p>
                <p className="text-sm text-muted-foreground">{workspace.seating_capacity} seats</p>
              </div>
            </div>
          )}
          {workspace.noise_level && (
            <div className="flex items-center gap-3">
              <Volume2 className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Noise Level</p>
                <p className="text-sm text-muted-foreground capitalize">{workspace.noise_level}</p>
              </div>
            </div>
          )}
          {workspace.good_for_calls && (
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Calls</p>
                <p className="text-sm text-muted-foreground">Call-friendly</p>
              </div>
            </div>
          )}
          {workspace.time_limit_hours !== null && workspace.time_limit_hours !== undefined && (
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Stay Length</p>
                <p className="text-sm text-muted-foreground">
                  {workspace.time_limit_hours === 0 ? "No listed limit" : `${workspace.time_limit_hours}h limit`}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Amenities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {workspace.has_coffee && <AmenityItem icon={<Coffee className="h-4 w-4 text-primary" />} label="Coffee" />}
            {workspace.has_food && <AmenityItem icon={<Utensils className="h-4 w-4 text-primary" />} label="Food" />}
            {workspace.has_veg && <AmenityItem icon={<Sprout className="h-4 w-4 text-primary" />} label="Vegetarian/Vegan options" />}
            {workspace.has_natural_light && <AmenityItem icon={<Sun className="h-4 w-4 text-primary" />} label="Natural Light" />}
            {workspace.has_air_conditioning && <AmenityItem icon={<Wind className="h-4 w-4 text-primary" />} label="A/C" />}
            {workspace.has_parking && <AmenityItem icon={<Car className="h-4 w-4 text-primary" />} label="Parking" />}
            {workspace.has_bike_parking && <AmenityItem icon={<Bike className="h-4 w-4 text-primary" />} label="Bike Parking" />}
            {workspace.is_accessible && <AmenityItem icon={<Accessibility className="h-4 w-4 text-primary" />} label="Accessible" />}
            {workspace.allows_pets && <AmenityItem icon={<PawPrint className="h-4 w-4 text-primary" />} label="Pet Friendly" />}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function AmenityItem({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <span className="text-sm">{label}</span>
    </div>
  );
}

function ScoreBlock({ icon, label, score }: { icon: ReactNode; label: string; score: number }) {
  return (
    <div className="rounded-md border bg-muted/25 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className="text-primary">{icon}</span>
          {label}
        </div>
        <span className="text-sm font-semibold tabular-nums">
          {score}<span className="text-muted-foreground">/100</span>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}
