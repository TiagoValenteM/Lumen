"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AddWorkspaceFormData, UpdateAddWorkspaceField } from "../_lib/types";

type AmbianceAmenitiesStepProps = {
  formData: AddWorkspaceFormData;
  updateField: UpdateAddWorkspaceField;
};

const amenityFields: Array<{ id: keyof AddWorkspaceFormData; label: string }> = [
  { id: "has_natural_light", label: "Natural Light" },
  { id: "has_air_conditioning", label: "Air Conditioning" },
  { id: "has_heating", label: "Heating" },
  { id: "has_restrooms", label: "Restrooms" },
  { id: "has_parking", label: "Parking" },
  { id: "has_bike_parking", label: "Bike Parking" },
  { id: "is_accessible", label: "Wheelchair Accessible" },
  { id: "allows_pets", label: "Pet Friendly" },
];

export function AmbianceAmenitiesStep({ formData, updateField }: AmbianceAmenitiesStepProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ambiance & Amenities</CardTitle>
        <CardDescription>What&apos;s the atmosphere like?</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="noise_level">Noise Level</Label>
          <Select value={formData.noise_level} onValueChange={(value) => updateField("noise_level", value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="quiet">Quiet</SelectItem>
              <SelectItem value="moderate">Moderate</SelectItem>
              <SelectItem value="loud">Loud</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="music_volume">Music Volume (1-5)</Label>
          <Select value={formData.music_volume.toString()} onValueChange={(value) => updateField("music_volume", parseInt(value))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 - Silent</SelectItem>
              <SelectItem value="2">2 - Quiet</SelectItem>
              <SelectItem value="3">3 - Moderate</SelectItem>
              <SelectItem value="4">4 - Loud</SelectItem>
              <SelectItem value="5">5 - Very Loud</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {amenityFields.map((field) => (
            <div key={field.id} className="flex items-center space-x-2">
              <Checkbox
                id={field.id}
                checked={Boolean(formData[field.id])}
                onCheckedChange={(checked) => updateField(field.id, checked)}
              />
              <Label htmlFor={field.id} className="font-normal">
                {field.label}
              </Label>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
