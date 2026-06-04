"use client";

import Image from "next/image";
import { ImageUpload } from "@/components/shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type PhotosStepProps = {
  uploadedPhotos: string[];
  onPhotoUploaded: (url: string) => void;
  onPhotoRemoved: (index: number) => void;
};

export function PhotosStep({ uploadedPhotos, onPhotoUploaded, onPhotoRemoved }: PhotosStepProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Photos</CardTitle>
        <CardDescription>Add at least one photo of the workspace (max 2MB each)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ImageUpload workspaceId="temp" onUploadComplete={onPhotoUploaded} onUploadError={(error) => console.error(error)} />

        {uploadedPhotos.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mt-6">
            {uploadedPhotos.map((url, index) => (
              <div key={url} className="relative aspect-video rounded-lg overflow-hidden border">
                <Image src={url} alt={`Upload ${index + 1}`} fill className="object-cover" sizes="33vw" />
                {index === 0 && (
                  <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">Primary</div>
                )}
                <button
                  onClick={() => onPhotoRemoved(index)}
                  className="absolute top-2 right-2 bg-destructive text-destructive-foreground p-1 rounded-full hover:bg-destructive/90 cursor-pointer"
                  aria-label={`Remove upload ${index + 1}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {uploadedPhotos.length === 0 && <p className="text-sm text-muted-foreground">No photos uploaded yet. At least one photo is recommended.</p>}
      </CardContent>
    </Card>
  );
}
