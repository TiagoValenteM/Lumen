"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Star, Trash2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { WorkspacePhotoRow } from "../_lib/types";

type PhotoModerationProps = {
  photos: WorkspacePhotoRow[];
  workspaceName: string;
  savingPhotoId: string | null;
  onUpdatePhoto: (photoId: string, next: Partial<WorkspacePhotoRow>) => void;
  onSetPrimaryPhoto: (photoId: string) => void;
  onDeletePhoto: (photo: WorkspacePhotoRow) => void;
};

export function PhotoModeration({
  photos,
  workspaceName,
  savingPhotoId,
  onUpdatePhoto,
  onSetPrimaryPhoto,
  onDeletePhoto,
}: PhotoModerationProps) {
  const [photoToDelete, setPhotoToDelete] = useState<WorkspacePhotoRow | null>(null);

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
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  disabled={savingPhotoId === photo.id}
                  onClick={() => setPhotoToDelete(photo)}
                >
                  {savingPhotoId === photo.id ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  Delete
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <Dialog open={Boolean(photoToDelete)} onOpenChange={(open) => !open && setPhotoToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this photo?</DialogTitle>
            <DialogDescription>
              This removes the photo from the workspace moderation queue. It cannot be restored from Lumen.
            </DialogDescription>
          </DialogHeader>
          {photoToDelete && (
            <div className="overflow-hidden rounded-md border bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoToDelete.url} alt={photoToDelete.caption || workspaceName} className="max-h-56 w-full object-cover" />
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={Boolean(photoToDelete && savingPhotoId === photoToDelete.id)}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              disabled={Boolean(photoToDelete && savingPhotoId === photoToDelete.id)}
              onClick={() => {
                if (!photoToDelete) return;
                onDeletePhoto(photoToDelete);
                setPhotoToDelete(null);
              }}
            >
              {photoToDelete && savingPhotoId === photoToDelete.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Delete photo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
