"use client";

import { CheckCircle2, Star, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { WorkspacePhotoRow } from "../_lib/types";

type PhotoModerationProps = {
  photos: WorkspacePhotoRow[];
  workspaceName: string;
  savingPhotoId: string | null;
  onUpdatePhoto: (photoId: string, next: Partial<WorkspacePhotoRow>) => void;
  onSetPrimaryPhoto: (photoId: string) => void;
};

export function PhotoModeration({
  photos,
  workspaceName,
  savingPhotoId,
  onUpdatePhoto,
  onSetPrimaryPhoto,
}: PhotoModerationProps) {
  if (photos.length === 0) return null;

  return (
    <div className="space-y-2">
      <Label>Submitted photos</Label>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {photos.map((photo) => (
          <div key={photo.id} className="overflow-hidden rounded-md border bg-card">
            <a
              href={photo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block aspect-video bg-muted"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt={photo.caption || workspaceName} className="h-full w-full object-cover" />
            </a>
            <div className="space-y-3 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant={photo.is_approved ? "default" : "outline"}>
                    {photo.is_approved ? "Approved" : "Pending"}
                  </Badge>
                  {photo.is_primary && (
                    <Badge variant="secondary">
                      <Star className="mr-1 h-3 w-3" />
                      Primary
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={savingPhotoId === photo.id}
                  onClick={() => onUpdatePhoto(photo.id, { is_approved: true })}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Approve
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={savingPhotoId === photo.id}
                  onClick={() => onUpdatePhoto(photo.id, { is_approved: false })}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={savingPhotoId === photo.id}
                  onClick={() => onSetPrimaryPhoto(photo.id)}
                >
                  <Star className="mr-2 h-4 w-4" />
                  Set primary
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
