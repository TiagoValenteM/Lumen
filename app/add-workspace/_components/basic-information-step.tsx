"use client";

import type { Dispatch, SetStateAction } from "react";
import { ChevronDown, MapPin } from "lucide-react";
import { LocationPicker, type LocationValue } from "@/components/shared";
import { InlineFeedback } from "@/components/shared/inline-feedback";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { AddWorkspaceFormData } from "../_lib/types";

type BasicInformationStepProps = {
  formData: AddWorkspaceFormData;
  setFormData: Dispatch<SetStateAction<AddWorkspaceFormData>>;
  updateField: (field: keyof AddWorkspaceFormData, value: string | number | boolean | null) => void;
  issue: { field: string; message: string } | null;
};

export function BasicInformationStep({ formData, setFormData, updateField, issue }: BasicInformationStepProps) {
  const errorId = (field: string) => issue?.field === field ? `${field}-error` : undefined;
  const feedback = (field: string) => issue?.field === field ? <InlineFeedback id={errorId(field)} error>{issue.message}</InlineFeedback> : null;
  return (
      <section aria-label="Basics" className="space-y-5 sm:space-y-6">
        <div className="space-y-2">
          <LocationPicker
            searchId="place-location"
            validationId={errorId("place-location")}
            value={{
              latitude: formData.latitude,
              longitude: formData.longitude,
              address: formData.address,
              city: formData.city_name,
              country: formData.country,
              source: formData.location_source,
              provider: formData.location_provider,
              providerId: formData.location_provider_id,
              confidence: formData.location_confidence,
              raw: formData.location_raw,
            }}
            onChange={(location: LocationValue) => {
              setFormData((prev) => ({
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
          {feedback("place-location")}
        </div>

        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
          <div className="space-y-2">
            <Label htmlFor="name">Place name *</Label>
            <Input
              id="name"
              className="h-11"
              aria-invalid={Boolean(errorId("name"))}
              aria-describedby={errorId("name")}
              maxLength={255}
              value={formData.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="e.g., Café Malea"
              required
            />
            {feedback("name")}
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Type *</Label>
            <Select value={formData.type} onValueChange={(value) => updateField("type", value)}>
              <SelectTrigger id="type" className="min-h-11 w-full" aria-invalid={Boolean(errorId("type"))} aria-describedby={errorId("type")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cafe">Café</SelectItem>
                <SelectItem value="coworking">Coworking Space</SelectItem>
                <SelectItem value="hotel_lobby">Hotel Lobby</SelectItem>
                <SelectItem value="library">Library</SelectItem>
                <SelectItem value="restaurant">Restaurant</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            {feedback("type")}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => updateField("address", e.target.value)}
              placeholder="Street address"
              className="h-11 pl-9"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="place-city">City *</Label>
            <Input id="place-city" className="h-11" value={formData.city_name} maxLength={255} required aria-invalid={Boolean(errorId("place-city"))} aria-describedby={errorId("place-city")}
              onChange={(event) => updateField("city_name", event.target.value)} />
            {feedback("place-city")}
          </div>
          <div className="space-y-2">
            <Label htmlFor="place-country">Country *</Label>
            <Input id="place-country" className="h-11" value={formData.country} maxLength={100} required aria-invalid={Boolean(errorId("place-country"))} aria-describedby={errorId("place-country")}
              onChange={(event) => updateField("country", event.target.value)} />
            {feedback("place-country")}
          </div>
        </div>

        <details className="group rounded-lg border border-border/60">
          <summary className="keyboard-focus flex min-h-11 cursor-pointer list-none items-center justify-between rounded-lg px-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
            Optional details
            <ChevronDown className="size-4 group-open:rotate-180" aria-hidden="true" />
          </summary>

          <div className="space-y-4 border-t border-border/60 p-3">
            <div className="space-y-2">
              <Label htmlFor="short_description">Short description</Label>
              <Input
                id="short_description"
                value={formData.short_description}
                onChange={(e) => updateField("short_description", e.target.value)}
                placeholder="One-line summary"
                maxLength={500}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Full description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => updateField("description", e.target.value)}
                placeholder="Describe the atmosphere and what makes it useful for work..."
                rows={4}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => updateField("website", e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  placeholder="+351 123 456 789"
                />
              </div>
            </div>
          </div>
        </details>
      </section>
  );
}
