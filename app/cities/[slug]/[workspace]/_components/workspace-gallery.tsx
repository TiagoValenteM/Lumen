"use client";

import { WorkspaceImage } from "@/components/features/workspace";
import type { Photo } from "@/lib/types";

type WorkspaceGalleryProps = {
  photos: Photo[];
  workspaceName: string;
};

export function WorkspaceGallery({ photos, workspaceName }: WorkspaceGalleryProps) {
  const primaryPhoto = photos.find((photo) => photo.is_primary) || photos[0];

  return (
    <div className="space-y-4">
      {primaryPhoto && (
        <div className="relative aspect-video w-full overflow-hidden rounded-lg">
          <WorkspaceImage src={primaryPhoto.url} alt={workspaceName} fill className="object-cover" priority />
        </div>
      )}
      {photos.length > 1 && (
        <div className="grid grid-cols-4 gap-4">
          {photos.slice(1, 5).map((photo) => (
            <div key={photo.id} className="relative aspect-video overflow-hidden rounded-lg">
              <WorkspaceImage src={photo.url} alt={photo.caption || workspaceName} fill className="object-cover" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
