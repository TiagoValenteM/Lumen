"use client";

import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { BRAND_NAME } from "@/lib/constants/brand";
import { getWorkabilityReport } from "@/lib/features/workspaces/workability-report";
import { getAvailabilityLabel, getStayLimitLabel } from "@/lib/features/workspaces/work-facts";
import type { WorkspaceDetail } from "@/lib/types";
import {
  Accessibility,
  Bike,
  Laptop,
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
  children?: ReactNode;
};

export function WorkspaceMainDetails({ workspace, children }: WorkspaceMainDetailsProps) {
  const workability = getWorkabilityReport(workspace);
  const checkedAt = workspace.work_facts_checked_at;
  const description = workspace.description || workspace.short_description;
  const hasProductivity = workspace.seating_capacity || workspace.noise_level || workspace.good_for_calls;
  const hasAmenities = workspace.has_coffee || workspace.has_food || workspace.has_veg || workspace.has_natural_light
    || workspace.has_air_conditioning || workspace.has_parking || workspace.has_bike_parking || workspace.is_accessible || workspace.allows_pets;

  return (
    <>
      <section aria-labelledby="workspace-work-facts" className="space-y-3">
          <h2 id="workspace-work-facts" className="flex items-center gap-2 text-xl font-semibold">
            <ShieldCheck className="size-5 text-primary" aria-hidden="true" /> Work facts
          </h2>
          <p className="text-sm text-muted-foreground">
            {checkedAt ? (
              <>Known facts checked by a {BRAND_NAME} moderator on{" "}
                <time dateTime={checkedAt}>{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(checkedAt))}</time>.</>
            ) : `Listed facts have not been checked by ${BRAND_NAME}.`}
          </p>
          <dl className="grid grid-cols-1 gap-x-5 divide-y divide-border/60 border-y border-border/60 min-[360px]:grid-cols-2 min-[360px]:divide-y-0">
            <Fact label="Laptops" icon={<Laptop className="size-4" />}
              value={getAvailabilityLabel(workspace.laptop_friendly, "Welcome", "Not allowed")} />
            <Fact label="Stay limit" icon={<Clock className="size-4" />}
              value={getStayLimitLabel(workspace.time_limit_hours, Boolean(checkedAt))} />
            <Fact label="Wi-Fi" icon={<Wifi className="size-4" />}
              value={getAvailabilityLabel(workspace.has_wifi)}
              detail={workspace.has_wifi === true && workspace.wifi_speed ? `Reported speed: ${workspace.wifi_speed.replaceAll("_", " ")}` : undefined} />
            <Fact label="Power outlets" icon={<Zap className="size-4" />}
              value={getAvailabilityLabel(workspace.has_power_outlets)}
              detail={workspace.has_power_outlets === true && workspace.power_outlet_availability ? `Reported availability: ${workspace.power_outlet_availability}/5` : undefined} />
          </dl>

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
      </section>

      {children}

      {description && (
        <DetailSection title="About">
          <p className="whitespace-pre-line text-muted-foreground [overflow-wrap:anywhere]">{description}</p>
        </DetailSection>
      )}

      {Boolean(hasProductivity) && <DetailSection title="Productivity">
        <div className="grid grid-cols-2 gap-4">
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
        </div>
      </DetailSection>}

      {hasAmenities && <DetailSection title="Amenities">
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
      </DetailSection>}
    </>
  );
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return <section aria-label={title} className="space-y-3 border-t border-border/60 pt-4">
    <h2 className="text-xl font-semibold">{title}</h2>
    {children}
  </section>;
}

function AmenityItem({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="shrink-0" aria-hidden="true">{icon}</span>
      <span className="min-w-0 text-sm [overflow-wrap:anywhere]">{label}</span>
    </div>
  );
}

function Fact({ icon, label, value, detail }: { icon: ReactNode; label: string; value: string; detail?: string }) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-3 py-3 text-sm">
      <dt className="flex items-center gap-2 text-muted-foreground"><span className="shrink-0">{icon}</span>{label}</dt>
      <dd className="min-w-0 text-right">
        <span className={value === "Unknown" ? "text-muted-foreground" : "font-medium"}>{value}</span>
        {detail && <span className="block text-xs text-muted-foreground">{detail}</span>}
      </dd>
    </div>
  );
}
