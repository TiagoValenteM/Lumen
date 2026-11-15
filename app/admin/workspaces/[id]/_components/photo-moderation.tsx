"use client";

import { useRef, useState } from "react";
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
import { ImageUpload } from "@/components/shared/image-upload";
import { ModerationStatus } from "../../../_components/moderation-status";
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
  const photoActionsRef = useRef<HTMLButtonElement | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <section id="submitted-photos" aria-labelledby="submitted-photos-title" className="flex scroll-mt-32 flex-col gap-3 border-t border-border/60 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="submitted-photos-title" className="text-lg font-semibold">Photos</h2>
        </div>
        <Badge variant="outline">{photos.length} photo{photos.length === 1 ? "" : "s"}</Badge>
      </div>
      <div className="rounded-lg bg-card p-3">
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
      <div className="divide-y divide-border/60">
        {photos.map((photo, index) => (
          <article
            key={photo.id}
            className="flex items-start gap-3 py-3 sm:items-center"
          >
            <a
              href={photo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="keyboard-focus block size-16 shrink-0 overflow-hidden rounded-md bg-muted sm:h-20 sm:w-28"
              aria-label={`Open photo ${index + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt={photo.caption || workspaceName} loading="lazy" className="h-full w-full object-cover" />
            </a>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <ModerationStatus label={photo.is_approved ? "Approved" : photo.is_approved === false ? "Hidden" : "Pending review"}
                      tone={photo.is_approved ? "attention" : "neutral"} />
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
                    <Button type="button" size="icon" variant="ghost" className="size-11" disabled={savingPhotoId === photo.id}
                      aria-label={`Photo ${index + 1} actions`} title="Photo actions" onPointerDown={(event) => { photoActionsRef.current = event.currentTarget; }}
                      onFocus={(event) => { photoActionsRef.current = event.currentTarget; }}>
                      {savingPhotoId === photo.id ? <Loader2 className="motion-safe:animate-spin" aria-hidden="true" /> : <MoreHorizontal aria-hidden="true" />}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuGroup>
                      <DropdownMenuItem disabled={photo.is_approved === false} onSelect={() => onUpdatePhoto(photo.id, { is_approved: false })}>
                        <XCircle className="h-4 w-4" />
                        Hide from public
                      </DropdownMenuItem>
                      <DropdownMenuItem disabled={Boolean(photo.is_primary)} onSelect={() => onSetPrimaryPhoto(photo.id)}>
                        <Star className="h-4 w-4" />
                        Set as primary
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onSelect={() => setPhotoToDelete(photo)}>
                      <Trash2 className="h-4 w-4" />
                      Delete photo
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {!photo.is_approved && <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="min-h-11"
                  disabled={savingPhotoId === photo.id}
                  onClick={() => onUpdatePhoto(photo.id, { is_approved: true })}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Approve photo
                </Button>
              </div>}
            </div>
          </article>
        ))}
      </div>
      <Dialog open={Boolean(photoToDelete)} onOpenChange={(open) => !open && setPhotoToDelete(null)}>
        <DialogContent onOpenAutoFocus={(event) => { event.preventDefault(); cancelRef.current?.focus(); }}
          onCloseAutoFocus={(event) => { event.preventDefault(); photoActionsRef.current?.focus(); }}>
          <DialogHeader>
            <DialogTitle>Delete this photo?</DialogTitle>
            <DialogDescription>
              This permanently removes the photo from this place.
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
              <Button ref={cancelRef} type="button" variant="outline" disabled={Boolean(photoToDelete && savingPhotoId === photoToDelete.id)}>
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
