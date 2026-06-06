"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocationPicker, type LocationValue } from "@/components/shared";
import type { AdminWorkspaceFormState } from "../_lib/types";

type LocationSectionProps = {
  form: AdminWorkspaceFormState;
  onChange: (updater: (prev: AdminWorkspaceFormState) => AdminWorkspaceFormState) => void;
  error?: string | null;
};

export function LocationSection({ form, onChange, error }: LocationSectionProps) {
  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label>Location</Label>
          {form.latitude !== null && form.longitude !== null && (
            <span className="text-xs text-muted-foreground">
              {form.latitude.toFixed(5)}, {form.longitude.toFixed(5)}
            </span>
          )}
        </div>
        <LocationPicker
          value={{
            latitude: form.latitude,
            longitude: form.longitude,
            address: form.address,
            city: form.city_name,
            country: form.country,
            source: form.location_source,
            provider: form.location_provider,
            providerId: form.location_provider_id,
            confidence: form.location_confidence,
            raw: form.location_raw,
          }}
          onChange={(location: LocationValue) => {
            onChange((prev) => ({
              ...prev,
              latitude: location.latitude,
              longitude: location.longitude,
              address: location.address,
              city_name: location.city,
              country: location.country,
              location_source: location.source,
              location_provider: location.provider,
              location_provider_id: location.providerId,
              location_confidence: location.confidence,
              location_raw: location.raw,
            }));
          }}
        />
        {error && (
          <p className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label>Address</Label>
        <Input
          value={form.address}
          onChange={(event) => onChange((prev) => ({ ...prev, address: event.target.value }))}
          placeholder="Address"
        />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>City</Label>
          <Input
            value={form.city_name}
            onChange={(event) => onChange((prev) => ({ ...prev, city_name: event.target.value }))}
            placeholder="City"
          />
        </div>
        <div className="space-y-2">
          <Label>Country</Label>
          <Input
            value={form.country}
            onChange={(event) => onChange((prev) => ({ ...prev, country: event.target.value }))}
            placeholder="Country"
          />
        </div>
      </div>
    </>
  );
}
