"use client";

import Image from "next/image";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { ImageUpload } from "@/components/shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type PhotosStepProps = {
  uploadedPhotos: string[];
  onPhotoUploaded: (url: string) => void;
  onPhotoMoved: (fromIndex: number, toIndex: number) => void;
  onPhotoRemoved: (index: number) => void;
};

export function PhotosStep({ uploadedPhotos, onPhotoMoved, onPhotoUploaded, onPhotoRemoved }: PhotosStepProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Photos</CardTitle>
        <CardDescription>Add one clear photo now. More can be added if they help reviewers understand the place.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ImageUpload
          workspaceId="temp"
          currentFileCount={uploadedPhotos.length}
          onUploadComplete={onPhotoUploaded}
          onUploadError={(error) => console.error(error)}
        />

        {uploadedPhotos.length > 0 && (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
            {uploadedPhotos.map((url, index) => (
              <div key={url} className="relative aspect-video overflow-hidden rounded-xl border border-border/30 bg-muted/15 shadow-sm shadow-black/5">
                <Image src={url} alt={`Upload ${index + 1}`} fill className="object-cover" sizes="33vw" />
                {index === 0 && (
                  <div className="absolute top-2 left-2 rounded-full bg-background/85 px-2 py-1 text-xs font-medium text-foreground shadow-sm shadow-black/10 backdrop-blur">
                    Primary
                  </div>
                )}
                <div className="absolute top-2 right-2 flex gap-1">
                  <button
                    type="button"
                    onClick={() => onPhotoRemoved(index)}
                    className="rounded-full bg-background/85 p-1 text-foreground shadow-sm shadow-black/10 backdrop-blur hover:bg-background"
                    aria-label={`Remove upload ${index + 1}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {uploadedPhotos.length > 1 && (
                  <div className="absolute inset-x-2 bottom-2 flex justify-between gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      onClick={() => onPhotoMoved(index, index - 1)}
                      disabled={index === 0}
                      aria-label={`Move upload ${index + 1} earlier`}
                      className="bg-background/85 shadow-sm shadow-black/10 backdrop-blur"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      onClick={() => onPhotoMoved(index, index + 1)}
                      disabled={index === uploadedPhotos.length - 1}
                      aria-label={`Move upload ${index + 1} later`}
                      className="bg-background/85 shadow-sm shadow-black/10 backdrop-blur"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {uploadedPhotos.length === 0 && <p className="text-sm text-muted-foreground">No photos uploaded yet. At least one photo is recommended.</p>}
      </CardContent>
    </Card>
  );
}
