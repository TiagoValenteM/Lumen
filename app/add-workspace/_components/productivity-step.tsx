"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AddWorkspaceFormData, UpdateAddWorkspaceField } from "../_lib/types";

type ProductivityStepProps = {
  formData: AddWorkspaceFormData;
  updateField: UpdateAddWorkspaceField;
};

export function ProductivityStep({ formData, updateField }: ProductivityStepProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Work setup</CardTitle>
        <CardDescription>What makes this a good place to work?</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border/35 bg-muted/15 p-4">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox id="has_wifi" checked={formData.has_wifi} onCheckedChange={(checked) => updateField("has_wifi", checked)} />
                <Label htmlFor="has_wifi" className="font-normal">
                  Has WiFi
                </Label>
              </div>

              {formData.has_wifi && (
                <div className="space-y-2">
                  <Label htmlFor="wifi_speed">WiFi Speed</Label>
                  <Select value={formData.wifi_speed} onValueChange={(value) => updateField("wifi_speed", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="slow">Slow</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="fast">Fast</SelectItem>
                      <SelectItem value="very_fast">Very Fast</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border/35 bg-muted/15 p-4">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="has_power_outlets"
                  checked={formData.has_power_outlets}
                  onCheckedChange={(checked) => updateField("has_power_outlets", checked)}
                />
                <Label htmlFor="has_power_outlets" className="font-normal">
                  Has Power Outlets
                </Label>
              </div>

              {formData.has_power_outlets && (
                <div className="space-y-2">
                  <Label htmlFor="power_outlet_availability">Outlet availability</Label>
                  <Select
                    value={formData.power_outlet_availability.toString()}
                    onValueChange={(value) => updateField("power_outlet_availability", parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Very Limited</SelectItem>
                      <SelectItem value="2">Limited</SelectItem>
                      <SelectItem value="3">Moderate</SelectItem>
                      <SelectItem value="4">Good</SelectItem>
                      <SelectItem value="5">Excellent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        </div>

        <details className="group rounded-xl border border-border/30 bg-muted/10 p-4">
          <summary className="cursor-pointer list-none text-sm font-medium outline-none">
            Optional work details
            <span className="ml-2 text-muted-foreground group-open:hidden">Seating, outdoor space, standing desks</span>
          </summary>

          <div className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="seating_capacity">Seating Capacity</Label>
                <Input
                  id="seating_capacity"
                  type="number"
                  value={formData.seating_capacity}
                  onChange={(e) => updateField("seating_capacity", parseInt(e.target.value) || 0)}
                  min="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="seating_comfort">Seating Comfort</Label>
                <Select value={formData.seating_comfort} onValueChange={(value) => updateField("seating_comfort", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="uncomfortable">Uncomfortable</SelectItem>
                    <SelectItem value="adequate">Adequate</SelectItem>
                    <SelectItem value="comfortable">Comfortable</SelectItem>
                    <SelectItem value="very_comfortable">Very Comfortable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="has_outdoor_seating"
                  checked={formData.has_outdoor_seating}
                  onCheckedChange={(checked) => updateField("has_outdoor_seating", checked)}
                />
                <Label htmlFor="has_outdoor_seating" className="font-normal">
                  Has Outdoor Seating
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="has_standing_desks"
                  checked={formData.has_standing_desks}
                  onCheckedChange={(checked) => updateField("has_standing_desks", checked)}
                />
                <Label htmlFor="has_standing_desks" className="font-normal">
                  Has Standing Desks
                </Label>
              </div>
            </div>
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
