"use client";

import type { Dispatch, SetStateAction } from "react";
import { CheckCircle2, MapPin } from "lucide-react";
import { LocationPicker, type LocationValue } from "@/components/shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { AddWorkspaceFormData } from "../_lib/types";

type BasicInformationStepProps = {
  formData: AddWorkspaceFormData;
  setFormData: Dispatch<SetStateAction<AddWorkspaceFormData>>;
  updateField: (field: keyof AddWorkspaceFormData, value: string | number | boolean | null) => void;
};

export function BasicInformationStep({ formData, setFormData, updateField }: BasicInformationStepProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Basics</CardTitle>
        <CardDescription>Find the place first, then add the few details reviewers need.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 sm:space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label>Location *</Label>
            {formData.latitude !== null && formData.longitude !== null && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Pin selected
              </span>
            )}
          </div>
          <LocationPicker
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
        </div>

        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
          <div className="space-y-2">
            <Label htmlFor="name">Place name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="e.g., Café Malea"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Type *</Label>
            <Select value={formData.type} onValueChange={(value) => updateField("type", value)}>
              <SelectTrigger>
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
              className="pl-9"
            />
          </div>
        </div>

        <details className="group rounded-xl border border-border/30 bg-muted/10 p-4">
          <summary className="cursor-pointer list-none text-sm font-medium outline-none">
            Optional details
            <span className="ml-2 text-muted-foreground group-open:hidden">Add description, website, or phone</span>
          </summary>

          <div className="mt-4 space-y-4">
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
      </CardContent>
    </Card>
  );
}
