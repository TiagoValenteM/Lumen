"use client";

import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AdminWorkspaceFormState } from "../_lib/types";

type AdminWorkDetailsSectionProps = {
  form: AdminWorkspaceFormState;
  onChange: (updater: (prev: AdminWorkspaceFormState) => AdminWorkspaceFormState) => void;
};

export function AdminWorkDetailsSection({ form, onChange }: AdminWorkDetailsSectionProps) {
  const update = <Key extends keyof AdminWorkspaceFormState>(key: Key, value: AdminWorkspaceFormState[Key]) => {
    onChange((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <section className="space-y-5 rounded-xl border border-border/30 bg-muted/10 p-4 sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">Work details</h2>
          <p className="text-sm text-muted-foreground">
            Review AI-filled workability signals, then adjust only what needs moderation.
          </p>
        </div>
        <div className="rounded-full bg-background/70 px-3 py-1 text-xs text-muted-foreground">
          Saved after Save changes
        </div>
      </div>

      <FieldGroup title="Core setup">
        <BooleanToggle label="WiFi" value={form.has_wifi} onChange={(value) => update("has_wifi", value)} />
        <SelectField
          label="WiFi speed"
          value={form.wifi_speed}
          onChange={(value) => update("wifi_speed", value)}
          options={["slow", "moderate", "fast", "very_fast"]}
          disabled={!form.has_wifi}
        />
        <BooleanToggle label="Power outlets" value={form.has_power_outlets} onChange={(value) => update("has_power_outlets", value)} />
        <NumberField label="Power availability" value={form.power_outlet_availability} min={0} max={5} onChange={(value) => update("power_outlet_availability", value)} />
        <BooleanToggle label="Laptop friendly" value={form.laptop_friendly} onChange={(value) => update("laptop_friendly", value)} />
        <NumberField label="Time limit hours" value={form.time_limit_hours} min={0} onChange={(value) => update("time_limit_hours", value)} />
      </FieldGroup>

      <FieldGroup title="Space and atmosphere">
        <NumberField label="Seating capacity" value={form.seating_capacity} min={0} onChange={(value) => update("seating_capacity", value)} />
        <SelectField
          label="Seating comfort"
          value={form.seating_comfort}
          onChange={(value) => update("seating_comfort", value)}
          options={["uncomfortable", "adequate", "comfortable", "very_comfortable"]}
        />
        <SelectField
          label="Noise level"
          value={form.noise_level}
          onChange={(value) => update("noise_level", value)}
          options={["quiet", "moderate", "loud"]}
        />
        <NumberField label="Music volume" value={form.music_volume} min={0} max={5} onChange={(value) => update("music_volume", value)} />
        <BooleanToggle label="Natural light" value={form.has_natural_light} onChange={(value) => update("has_natural_light", value)} />
        <BooleanToggle label="Outdoor seating" value={form.has_outdoor_seating} onChange={(value) => update("has_outdoor_seating", value)} />
        <BooleanToggle label="Air conditioning" value={form.has_air_conditioning} onChange={(value) => update("has_air_conditioning", value)} />
        <BooleanToggle label="Heating" value={form.has_heating} onChange={(value) => update("has_heating", value)} />
        <BooleanToggle label="Standing desks" value={form.has_standing_desks} onChange={(value) => update("has_standing_desks", value)} />
      </FieldGroup>

      <FieldGroup title="Amenities and policies">
        <BooleanToggle label="Restrooms" value={form.has_restrooms} onChange={(value) => update("has_restrooms", value)} />
        <BooleanToggle label="Parking" value={form.has_parking} onChange={(value) => update("has_parking", value)} />
        <BooleanToggle label="Bike parking" value={form.has_bike_parking} onChange={(value) => update("has_bike_parking", value)} />
        <BooleanToggle label="Accessible" value={form.is_accessible} onChange={(value) => update("is_accessible", value)} />
        <BooleanToggle label="Pets" value={form.allows_pets} onChange={(value) => update("allows_pets", value)} />
        <BooleanToggle label="Minimum purchase" value={form.minimum_purchase_required} onChange={(value) => update("minimum_purchase_required", value)} />
      </FieldGroup>

      <FieldGroup title="Food and best use">
        <BooleanToggle label="Food" value={form.has_food} onChange={(value) => update("has_food", value)} />
        <BooleanToggle label="Vegetarian" value={form.has_veg} onChange={(value) => update("has_veg", value)} />
        <BooleanToggle label="Coffee" value={form.has_coffee} onChange={(value) => update("has_coffee", value)} />
        <BooleanToggle label="Alcohol" value={form.has_alcohol} onChange={(value) => update("has_alcohol", value)} />
        <NumberField label="Price range" value={form.price_range} min={0} max={4} onChange={(value) => update("price_range", value)} />
        <BooleanToggle label="Meetings" value={form.good_for_meetings} onChange={(value) => update("good_for_meetings", value)} />
        <BooleanToggle label="Calls" value={form.good_for_calls} onChange={(value) => update("good_for_calls", value)} />
        <BooleanToggle label="Groups" value={form.good_for_groups} onChange={(value) => update("good_for_groups", value)} />
      </FieldGroup>
    </section>
  );
}

function FieldGroup({ children, title }: { children: ReactNode; title: string }) {
  return (
    <div className="space-y-3 border-t border-border/25 pt-4 first:border-t-0 first:pt-0">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{children}</div>
    </div>
  );
}

function BooleanToggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex min-h-10 items-center justify-between gap-3 rounded-lg bg-background/60 px-3 py-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="grid grid-cols-2 rounded-md border border-border/30 bg-muted/20 p-0.5">
        <Button
          type="button"
          size="sm"
          variant={value ? "default" : "ghost"}
          className="h-7 px-3 text-xs"
          onClick={() => onChange(true)}
        >
          Yes
        </Button>
        <Button
          type="button"
          size="sm"
          variant={!value ? "default" : "ghost"}
          className="h-7 px-3 text-xs"
          onClick={() => onChange(false)}
        >
          No
        </Button>
      </div>
    </div>
  );
}

function SelectField({
  disabled,
  label,
  onChange,
  options,
  value,
}: {
  disabled?: boolean;
  label: string;
  onChange: (value: string) => void;
  options: string[];
  value: string;
}) {
  return (
    <div className="space-y-1.5 rounded-lg bg-background/60 p-3">
      <Label className="text-sm font-medium">{label}</Label>
      <Select value={value || "none"} onValueChange={(next) => onChange(next === "none" ? "" : next)} disabled={disabled}>
        <SelectTrigger className="h-9 bg-background">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Unknown</SelectItem>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option.replaceAll("_", " ")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function NumberField({
  label,
  max,
  min,
  onChange,
  value,
}: {
  label: string;
  max?: number;
  min?: number;
  onChange: (value: number) => void;
  value: number;
}) {
  return (
    <div className="space-y-1.5 rounded-lg bg-background/60 p-3">
      <Label className="text-sm font-medium">{label}</Label>
      <Input
        type="number"
        min={min}
        max={max}
        value={value || ""}
        onChange={(event) => onChange(Number(event.target.value) || 0)}
        className="h-9 bg-background"
      />
    </div>
  );
}
