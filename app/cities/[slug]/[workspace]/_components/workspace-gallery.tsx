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
  const selectedIndex = Math.max(0, orderedPhotos.findIndex((photo) => photo.id === selectedPhoto.id));

  const selectByOffset = (offset: number) => {
    const nextIndex = (selectedIndex + offset + orderedPhotos.length) % orderedPhotos.length;
    setSelectedPhotoId(orderedPhotos[nextIndex]?.id ?? null);
  };

  if (!selectedPhoto) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-border/30 bg-card/70 shadow-md shadow-black/5 dark:shadow-black/20">
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        <WorkspaceImage src={selectedPhoto.url} alt={selectedPhoto.caption || workspaceName} fill className="object-cover" priority />

        {orderedPhotos.length > 1 && (
          <>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="absolute left-3 top-1/2 size-9 -translate-y-1/2 rounded-full bg-background/85 shadow-md shadow-black/10 backdrop-blur-md dark:shadow-black/30"
              onClick={() => selectByOffset(-1)}
              aria-label="Show previous photo"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="absolute right-3 top-1/2 size-9 -translate-y-1/2 rounded-full bg-background/85 shadow-md shadow-black/10 backdrop-blur-md dark:shadow-black/30"
              onClick={() => selectByOffset(1)}
              aria-label="Show next photo"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        )}

        <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-background/90 px-3 py-1 text-xs font-medium text-foreground shadow-sm shadow-black/10 backdrop-blur-sm dark:shadow-black/30">
          <Images className="h-3.5 w-3.5" />
          {selectedIndex + 1} / {orderedPhotos.length}
        </div>
      </div>

      {(selectedPhoto.caption || orderedPhotos.length > 1) && (
        <div className="space-y-3 p-3">
          {selectedPhoto.caption && (
            <p className="text-sm text-muted-foreground">{selectedPhoto.caption}</p>
          )}

          {orderedPhotos.length > 1 && (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {orderedPhotos.map((photo, index) => (
                <button
                  key={photo.id}
                  type="button"
                  className={`relative aspect-video overflow-hidden rounded-lg border transition-all ${
                    photo.id === selectedPhoto.id
                      ? "border-primary opacity-100 ring-2 ring-primary/20"
                      : "border-border/30 opacity-70 hover:opacity-100"
                  }`}
                  onClick={() => setSelectedPhotoId(photo.id)}
                  aria-label={`Show photo ${index + 1} of ${orderedPhotos.length}`}
                  aria-current={photo.id === selectedPhoto.id ? "true" : undefined}
                >
                  <WorkspaceImage src={photo.url} alt={photo.caption || workspaceName} fill className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
