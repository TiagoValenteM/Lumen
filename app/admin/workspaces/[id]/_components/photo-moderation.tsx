"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, MoreHorizontal, Star, Trash2, XCircle } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/shared/image-upload";
import type { WorkspacePhotoRow } from "../_lib/types";

type PhotoModerationProps = {
  photos: WorkspacePhotoRow[];
  workspaceId: string;
  workspaceName: string;
  savingPhotoId: string | null;
  uploadingPhoto: boolean;
  onPhotoUploaded: (url: string) => void;
  onPhotoUploadError: (error: string) => void;
  onUpdatePhoto: (photoId: string, next: Partial<WorkspacePhotoRow>) => void;
  onSetPrimaryPhoto: (photoId: string) => void;
  onDeletePhoto: (photo: WorkspacePhotoRow) => void;
};

export function PhotoModeration({
  photos,
  workspaceId,
  workspaceName,
  savingPhotoId,
  uploadingPhoto,
  onPhotoUploaded,
  onPhotoUploadError,
  onUpdatePhoto,
  onSetPrimaryPhoto,
  onDeletePhoto,
}: PhotoModerationProps) {
  const [photoToDelete, setPhotoToDelete] = useState<WorkspacePhotoRow | null>(null);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Label>Submitted photos</Label>
          <p className="text-sm text-muted-foreground">Upload missing photos, approve visible photos, and choose one primary image.</p>
        </div>
        <Badge variant="outline">{photos.length} photo{photos.length === 1 ? "" : "s"}</Badge>
      </div>
      <div className="rounded-lg border border-dashed border-border/40 bg-muted/10 p-3">
        <ImageUpload
          workspaceId={workspaceId}
          currentFileCount={photos.length}
          maxFiles={8}
          onUploadComplete={onPhotoUploaded}
          onUploadError={onPhotoUploadError}
          className={uploadingPhoto ? "pointer-events-none opacity-70" : ""}
        />
        {photos.length === 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            This place has no photos yet. Uploading here creates an approved admin photo and uses it as primary.
          </p>
        )}
      </div>
      <div className="grid grid-cols-1 gap-3">
        {photos.map((photo) => (
          <article
            key={photo.id}
            className="flex flex-col overflow-hidden rounded-lg border border-border/35 bg-card/70 shadow-sm shadow-black/5 md:flex-row"
          >
            <a
              href={photo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block aspect-[4/3] bg-muted md:w-52 md:shrink-0"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt={photo.caption || workspaceName} className="h-full w-full object-cover" />
            </a>
            <div className="flex min-w-0 flex-1 flex-col gap-3 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={photo.is_approved ? "default" : "outline"}>
                      {photo.is_approved ? "Approved" : photo.is_approved === false ? "Hidden" : "Pending review"}
                    </Badge>
                    {photo.is_primary && (
                      <Badge variant="secondary">
                        <Star className="mr-1 h-3 w-3" />
                        Primary
                      </Badge>
                    )}
                  </div>
                  {photo.caption && <p className="line-clamp-2 text-sm text-muted-foreground">{photo.caption}</p>}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" size="icon-sm" variant="ghost" disabled={savingPhotoId === photo.id} aria-label="Photo actions">
                      {savingPhotoId === photo.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuGroup>
                      <DropdownMenuItem disabled={photo.is_approved === true} onClick={() => onUpdatePhoto(photo.id, { is_approved: true })}>
                        <CheckCircle2 className="h-4 w-4" />
                        Approve photo
                      </DropdownMenuItem>
                      <DropdownMenuItem disabled={photo.is_approved === false} onClick={() => onUpdatePhoto(photo.id, { is_approved: false })}>
                        <XCircle className="h-4 w-4" />
                        Hide from public
                      </DropdownMenuItem>
                      <DropdownMenuItem disabled={Boolean(photo.is_primary)} onClick={() => onSetPrimaryPhoto(photo.id)}>
                        <Star className="h-4 w-4" />
                        Set as primary
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={() => setPhotoToDelete(photo)}>
                      <Trash2 className="h-4 w-4" />
                      Delete photo
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={photo.is_approved ? "secondary" : "default"}
                  disabled={savingPhotoId === photo.id || photo.is_approved === true}
                  onClick={() => onUpdatePhoto(photo.id, { is_approved: true })}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Approve
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={savingPhotoId === photo.id || photo.is_approved === false}
                  onClick={() => onUpdatePhoto(photo.id, { is_approved: false })}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Hide from public
                </Button>
                {!photo.is_primary && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={savingPhotoId === photo.id}
                    onClick={() => onSetPrimaryPhoto(photo.id)}
                  >
                    <Star className="mr-2 h-4 w-4" />
                    Set primary
                  </Button>
                )}
                <Button type="button" size="sm" variant="ghost" disabled={savingPhotoId === photo.id} onClick={() => setPhotoToDelete(photo)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
              {!photo.is_approved && (
                <p className="text-xs text-muted-foreground">
                  Hidden or pending photos are not shown on the public workspace page.
                </p>
              )}
            </div>
          </article>
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
    </section>
  );
}
