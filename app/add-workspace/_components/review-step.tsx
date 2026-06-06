"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { Camera, CheckCircle2, MapPin, Pencil, Plug, Volume2, Wifi } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AddWorkspaceFormData } from "../_lib/types";

type ReviewStepProps = {
  formData: AddWorkspaceFormData;
  uploadedPhotos: string[];
  onEditStep: (step: number) => void;
};

export function ReviewStep({ formData, onEditStep, uploadedPhotos }: ReviewStepProps) {
  const workBadges = [
    formData.has_wifi ? `${formatSelectValue(formData.wifi_speed)} WiFi` : null,
    formData.has_power_outlets ? `${formatPowerAvailability(formData.power_outlet_availability)} outlets` : null,
    formData.laptop_friendly ? "Laptop friendly" : null,
    formData.good_for_calls ? "Call-friendly" : null,
    formData.good_for_meetings ? "Meeting-friendly" : null,
  ].filter(Boolean);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Review</CardTitle>
        <CardDescription>Check the essentials before sending this place to moderation.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <ReviewBlock title="Place" step={1} onEditStep={onEditStep}>
          <div className="space-y-2">
            <div>
              <p className="text-lg font-semibold leading-tight">{formData.name || "Unnamed place"}</p>
              <p className="text-sm capitalize text-muted-foreground">{formatSelectValue(formData.type)}</p>
            </div>
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{formData.address || [formData.city_name, formData.country].filter(Boolean).join(", ") || "No address yet"}</span>
            </div>
            {formData.latitude !== null && formData.longitude !== null && (
              <div className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Pin saved
              </div>
            )}
          </div>
        </ReviewBlock>

        <ReviewBlock title="Workability" step={2} onEditStep={onEditStep}>
          <div className="flex flex-wrap gap-2">
            {workBadges.length > 0 ? (
              workBadges.map((badge) => (
                <Badge key={badge} variant="secondary" className="rounded-full">
                  {badge}
                </Badge>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No workability details added.</p>
            )}
          </div>
          <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
            <span className="inline-flex items-center gap-2">
              <Wifi className="h-4 w-4" />
              {formData.has_wifi ? "WiFi" : "No WiFi"}
            </span>
            <span className="inline-flex items-center gap-2">
              <Plug className="h-4 w-4" />
              {formData.has_power_outlets ? "Power" : "No power noted"}
            </span>
            <span className="inline-flex items-center gap-2">
              <Volume2 className="h-4 w-4" />
              {formatSelectValue(formData.noise_level)}
            </span>
          </div>
        </ReviewBlock>

        <ReviewBlock title="Photos" step={5} onEditStep={onEditStep}>
          {uploadedPhotos.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {uploadedPhotos.slice(0, 3).map((photo, index) => (
                <div key={photo} className="relative aspect-video overflow-hidden rounded-lg bg-muted">
                  <Image src={photo} alt={`Review upload ${index + 1}`} fill className="object-cover" sizes="30vw" />
                  {index === 0 && (
                    <span className="absolute left-1.5 top-1.5 rounded-full bg-background/85 px-2 py-0.5 text-[10px] font-medium backdrop-blur">
                      Primary
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Camera className="h-4 w-4" />
              No photos uploaded.
            </div>
          )}
        </ReviewBlock>
      </CardContent>
    </Card>
  );
}

function ReviewBlock({
  children,
  onEditStep,
  step,
  title,
}: {
  children: ReactNode;
  onEditStep: (step: number) => void;
  step: number;
  title: string;
}) {
  return (
    <section className="rounded-xl border border-border/30 bg-muted/10 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-medium">{title}</h3>
        <Button type="button" variant="ghost" size="sm" onClick={() => onEditStep(step)}>
          <Pencil className="h-4 w-4" />
          Edit
        </Button>
      </div>
      {children}
    </section>
  );
}

function formatSelectValue(value: string) {
  return value.replace(/_/g, " ");
}

function formatPowerAvailability(value: number) {
  if (value >= 5) return "Excellent";
  if (value >= 4) return "Good";
  if (value >= 3) return "Moderate";
  return "Limited";
}
