"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { City, Photo, WorkspaceDetail } from "@/lib/types";
import { Eye, Info } from "lucide-react";
import { WorkspaceGallery } from "@/app/cities/[slug]/[workspace]/_components/workspace-gallery";
import { WorkspaceHeader } from "@/app/cities/[slug]/[workspace]/_components/workspace-header";
import { WorkspaceMainDetails } from "@/app/cities/[slug]/[workspace]/_components/workspace-main-details";
import type { AdminWorkspaceFormState, WorkspaceDetailMinimal, WorkspacePhotoRow } from "../_lib/types";

type WorkspacePublishedPreviewProps = {
  form: AdminWorkspaceFormState;
  photos: WorkspacePhotoRow[];
  workspace: WorkspaceDetailMinimal;
};

export function WorkspacePublishedPreview({ form, photos, workspace }: WorkspacePublishedPreviewProps) {
  const previewWorkspace = toPreviewWorkspace(workspace, form);
  const previewCity = toPreviewCity(workspace, form);
  const previewPhotos = toPreviewPhotos(photos);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-xl border border-border/30 bg-muted/15 p-4 shadow-sm shadow-black/5 dark:shadow-black/20 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2 font-semibold">
            <Eye className="h-5 w-5 text-primary" />
            Published page preview
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Admin-only preview using the current saved moderation data. This is not a public URL.
          </p>
        </div>
        <Badge variant="outline" className="w-fit capitalize">
          {form.status}
        </Badge>
      </div>

      <WorkspaceHeader city={previewCity} workspace={previewWorkspace} />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-8">
          <WorkspaceMainDetails workspace={previewWorkspace} />
          {previewPhotos.length > 0 ? (
            <section className="space-y-4" aria-labelledby="admin-preview-photos">
              <div>
                <h2 id="admin-preview-photos" className="text-2xl font-semibold">
                  Photos
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Pending and approved moderation photos are included so you can judge the final look.
                </p>
              </div>
              <WorkspaceGallery photos={previewPhotos} workspaceName={previewWorkspace.name} />
            </section>
          ) : (
            <div className="rounded-xl border border-border/30 bg-muted/15 p-4 text-sm text-muted-foreground">
              No photos are available yet. The public page would show the details without a gallery.
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Public actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button type="button" variant="outline" size="lg" className="w-full" disabled>
                Mark as visited
              </Button>
              <Button type="button" variant="outline" size="lg" className="w-full" disabled>
                Save place
              </Button>
              <Button type="button" variant="outline" size="lg" className="w-full" disabled>
                Write review
              </Button>
              <p className="flex items-start gap-2 text-xs text-muted-foreground">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Interactive public actions are disabled in moderation preview.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              {previewWorkspace.website && <p className="break-all">{previewWorkspace.website}</p>}
              {previewWorkspace.phone && <p>{previewWorkspace.phone}</p>}
              {previewWorkspace.address && <p>{previewWorkspace.address}</p>}
              {!previewWorkspace.website && !previewWorkspace.phone && !previewWorkspace.address && <p>No contact details yet.</p>}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function toPreviewCity(workspace: WorkspaceDetailMinimal, form: AdminWorkspaceFormState): City {
  return {
    id: form.city_id || workspace.city_id || "preview-city",
    name: form.city_name || workspace.city_name || "Unspecified city",
    slug: workspace.city_slug || "preview-city",
    country: form.country || workspace.country || "Unknown",
  };
}

function toPreviewPhotos(photos: WorkspacePhotoRow[]): Photo[] {
  return photos
    .map((photo) => ({
      id: photo.id,
      url: photo.url,
      caption: photo.caption,
      is_primary: Boolean(photo.is_primary),
    }))
    .sort((a, b) => Number(b.is_primary) - Number(a.is_primary));
}

function toPreviewWorkspace(workspace: WorkspaceDetailMinimal, form: AdminWorkspaceFormState): WorkspaceDetail {
  return {
    id: workspace.id,
    created_at: workspace.created_at ?? undefined,
    name: form.name || workspace.name || "Unnamed place",
    slug: workspace.slug,
    type: workspace.type || "cafe",
    short_description: form.short_description || workspace.short_description || null,
    description: workspace.description || form.short_description || null,
    address: form.address || workspace.address || null,
    latitude: form.latitude,
    longitude: form.longitude,
    has_wifi: Boolean(workspace.has_wifi),
    wifi_speed: workspace.wifi_speed || null,
    has_power_outlets: Boolean(workspace.has_power_outlets),
    power_outlet_availability: workspace.power_outlet_availability ?? null,
    seating_capacity: workspace.seating_capacity ?? null,
    has_outdoor_seating: Boolean(workspace.has_outdoor_seating),
    noise_level: workspace.noise_level || null,
    best_time_to_visit: workspace.best_time_to_visit || null,
    atmosphere_rating: workspace.atmosphere_rating ?? null,
    productivity_rating: workspace.productivity_rating ?? null,
    comfort_rating: workspace.comfort_rating ?? null,
    service_rating: workspace.service_rating ?? null,
    price_range: workspace.price_range === null || workspace.price_range === undefined ? null : String(workspace.price_range),
    has_food: Boolean(workspace.has_food),
    has_veg: Boolean(workspace.has_veg),
    has_alcohol: Boolean(workspace.has_alcohol),
    has_coffee: Boolean(workspace.has_coffee),
    has_natural_light: Boolean(workspace.has_natural_light),
    has_air_conditioning: Boolean(workspace.has_air_conditioning),
    has_heating: Boolean(workspace.has_heating),
    has_restrooms: Boolean(workspace.has_restrooms),
    has_parking: Boolean(workspace.has_parking),
    has_bike_parking: Boolean(workspace.has_bike_parking),
    is_accessible: Boolean(workspace.is_accessible),
    allows_pets: Boolean(workspace.allows_pets),
    website: workspace.website || null,
    phone: workspace.phone || null,
    laptop_friendly: Boolean(workspace.laptop_friendly),
    time_limit_hours: workspace.time_limit_hours ?? null,
    minimum_purchase_required: Boolean(workspace.minimum_purchase_required),
    good_for_meetings: Boolean(workspace.good_for_meetings),
    good_for_calls: Boolean(workspace.good_for_calls),
    good_for_groups: Boolean(workspace.good_for_groups),
    overall_rating: workspace.overall_rating ?? null,
    total_reviews: workspace.total_reviews ?? 0,
    last_verified_at: workspace.last_verified_at ?? null,
    reported_change_count: workspace.reported_change_count ?? null,
    rejection_reason: workspace.rejection_reason,
    admin_notes: workspace.admin_notes,
  };
}
