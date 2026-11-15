"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { WorkspaceImage } from "@/components/features/workspace";
import type { Photo } from "@/lib/types";
import { ChevronLeft, ChevronRight, Images } from "lucide-react";

type WorkspaceGalleryProps = {
  photos: Photo[];
  workspaceName: string;
};

export function WorkspaceGallery({ photos, workspaceName }: WorkspaceGalleryProps) {
  const orderedPhotos = useMemo(() => {
    return [...photos].sort((a, b) => Number(Boolean(b.is_primary)) - Number(Boolean(a.is_primary)));
  }, [photos]);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const selectedPhoto = orderedPhotos.find((photo) => photo.id === selectedPhotoId) || orderedPhotos[0];
  const selectedIndex = Math.max(0, orderedPhotos.findIndex((photo) => photo.id === selectedPhoto?.id));

  const selectByOffset = (offset: number) => {
    const nextIndex = (selectedIndex + offset + orderedPhotos.length) % orderedPhotos.length;
    setSelectedPhotoId(orderedPhotos[nextIndex]?.id ?? null);
  };

  if (!selectedPhoto) return null;

  return (
    <div className="space-y-2">
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
        <WorkspaceImage src={selectedPhoto.url} alt={selectedPhoto.caption || workspaceName} fill className="object-cover" />

        {orderedPhotos.length > 1 && (
          <>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="absolute left-2 top-1/2 size-11 -translate-y-1/2 rounded-full bg-background/95"
              onClick={() => selectByOffset(-1)}
              aria-label="Show previous photo"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="absolute right-2 top-1/2 size-11 -translate-y-1/2 rounded-full bg-background/95"
              onClick={() => selectByOffset(1)}
              aria-label="Show next photo"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        )}

        <div role="status" className="absolute bottom-2 left-2 flex items-center gap-2 rounded-full bg-background/95 px-2.5 py-1 text-xs font-medium">
          <Images className="h-3.5 w-3.5" aria-hidden="true" />
          {selectedIndex + 1} / {orderedPhotos.length}
        </div>
      </div>

      {orderedPhotos.length > 1 && (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {orderedPhotos.map((photo, index) => (
                <button
                  key={photo.id}
                  type="button"
                  className={`keyboard-focus relative aspect-video min-h-11 overflow-hidden rounded-md border transition-opacity ${
                    photo.id === selectedPhoto.id
                      ? "border-primary opacity-100 ring-2 ring-primary/20"
                      : "border-border/30 opacity-70 hover:opacity-100"
                  }`}
                  onClick={() => setSelectedPhotoId(photo.id)}
                  aria-label={`Show photo ${index + 1} of ${orderedPhotos.length}`}
                  aria-current={photo.id === selectedPhoto.id ? "true" : undefined}
                >
                  <WorkspaceImage src={photo.url} alt="" fill className="object-cover" />
                </button>
              ))}
            </div>
      )}
    </div>
  );
}
