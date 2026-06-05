"use client";

import type { Dispatch, SetStateAction } from "react";
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
        <CardTitle>Basic Information</CardTitle>
        <CardDescription>Tell us about the workspace</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name">Workspace Name *</Label>
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

        <div className="space-y-2">
          <Label>Location *</Label>
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

        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <Input
            id="address"
            value={formData.address}
            onChange={(e) => updateField("address", e.target.value)}
            placeholder="Street address (auto-filled from location search)"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="short_description">Short Description</Label>
          <Input
            id="short_description"
            value={formData.short_description}
            onChange={(e) => updateField("short_description", e.target.value)}
            placeholder="One-line summary (max 500 characters)"
            maxLength={500}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Full Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => updateField("description", e.target.value)}
            placeholder="Describe the workspace, atmosphere, and what makes it special..."
            rows={5}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
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
      </CardContent>
    </Card>
  );
}
