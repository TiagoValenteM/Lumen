"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AddWorkspaceFormData, UpdateAddWorkspaceField } from "../_lib/types";

type FoodPoliciesStepProps = {
  formData: AddWorkspaceFormData;
  updateField: UpdateAddWorkspaceField;
};

export function FoodPoliciesStep({ formData, updateField }: FoodPoliciesStepProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Food & policies</CardTitle>
        <CardDescription>What&apos;s available and what are the rules?</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center space-x-2">
            <Checkbox id="has_food" checked={formData.has_food} onCheckedChange={(checked) => updateField("has_food", checked)} />
            <Label htmlFor="has_food" className="font-normal">
              Serves Food
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="has_veg"
              checked={formData.has_veg}
              onCheckedChange={(checked) => updateField("has_veg", checked)}
              disabled={!formData.has_food}
            />
            <Label htmlFor="has_veg" className="font-normal">
              Vegetarian/Vegan options
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox id="has_coffee" checked={formData.has_coffee} onCheckedChange={(checked) => updateField("has_coffee", checked)} />
            <Label htmlFor="has_coffee" className="font-normal">
              Serves Coffee
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox id="has_alcohol" checked={formData.has_alcohol} onCheckedChange={(checked) => updateField("has_alcohol", checked)} />
            <Label htmlFor="has_alcohol" className="font-normal">
              Serves Alcohol
            </Label>
          </div>
        </div>

        <details className="group rounded-xl border border-border/30 bg-muted/10 p-4">
          <summary className="cursor-pointer list-none text-sm font-medium outline-none">
            Optional policy details
            <span className="ml-2 text-muted-foreground group-open:hidden">Prices, laptop rules, calls, meetings</span>
          </summary>

          <div className="mt-4 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="price_range">Price Range</Label>
              <Select value={formData.price_range.toString()} onValueChange={(value) => updateField("price_range", parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">$ - Budget</SelectItem>
                  <SelectItem value="2">$$ - Moderate</SelectItem>
                  <SelectItem value="3">$$$ - Expensive</SelectItem>
                  <SelectItem value="4">$$$$ - Very Expensive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="laptop_friendly"
                  checked={formData.laptop_friendly}
                  onCheckedChange={(checked) => updateField("laptop_friendly", checked)}
                />
                <Label htmlFor="laptop_friendly" className="font-normal">
                  Laptop Friendly
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="minimum_purchase_required"
                  checked={formData.minimum_purchase_required}
                  onCheckedChange={(checked) => updateField("minimum_purchase_required", checked)}
                />
                <Label htmlFor="minimum_purchase_required" className="font-normal">
                  Minimum Purchase Required
                </Label>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="time_limit_hours">Time Limit (hours, 0 for none)</Label>
                <Input
                  id="time_limit_hours"
                  type="number"
                  value={formData.time_limit_hours}
                  onChange={(e) => updateField("time_limit_hours", parseInt(e.target.value) || 0)}
                  min="0"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="good_for_meetings"
                  checked={formData.good_for_meetings}
                  onCheckedChange={(checked) => updateField("good_for_meetings", checked)}
                />
                <Label htmlFor="good_for_meetings" className="font-normal">
                  Good for Meetings
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="good_for_calls"
                  checked={formData.good_for_calls}
                  onCheckedChange={(checked) => updateField("good_for_calls", checked)}
                />
                <Label htmlFor="good_for_calls" className="font-normal">
                  Good for Phone Calls
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="good_for_groups"
                  checked={formData.good_for_groups}
                  onCheckedChange={(checked) => updateField("good_for_groups", checked)}
                />
                <Label htmlFor="good_for_groups" className="font-normal">
                  Good for Groups
                </Label>
              </div>
            </div>
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
