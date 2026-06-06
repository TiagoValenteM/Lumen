"use client";

import { useRef, useState, type ChangeEvent } from "react";
import Image from "next/image";
import { Upload, X, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  validateImage,
  uploadWorkspaceImage,
  MAX_IMAGE_SIZE,
  ALLOWED_IMAGE_TYPES,
  prepareWorkspaceImageForUpload,
} from "@/lib/utils/image-upload";
import { useAuth } from "@/contexts/AuthContext";
import { getErrorMessage } from "@/lib/utils";

interface ImageUploadProps {
  workspaceId: string;
  onUploadComplete: (url: string) => void;
  onUploadError?: (error: string) => void;
  maxFiles?: number;
  currentFileCount?: number;
  className?: string;
}

export function ImageUpload({
  workspaceId,
  onUploadComplete,
  onUploadError,
  maxFiles = 5,
  currentFileCount = 0,
  className = "",
}: ImageUploadProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const limitReached = currentFileCount >= maxFiles;

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setError(null);
    setPreview(null);

    if (limitReached) {
      const limitError = `You can upload up to ${maxFiles} photos.`;
      setError(limitError);
      if (onUploadError) onUploadError(limitError);
      return;
    }

    setPreparing(true);
    let uploadFile = file;
    try {
      uploadFile = await prepareWorkspaceImageForUpload(file);
    } catch (err) {
      const errorMessage = getErrorMessage(err, "Failed to prepare image");
      setError(errorMessage);
      if (onUploadError) onUploadError(errorMessage);
      setPreparing(false);
      return;
    }

    const validation = validateImage(uploadFile);
    if (!validation.isValid) {
      setError(validation.error);
      if (onUploadError) onUploadError(validation.error);
      setPreparing(false);
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(uploadFile);
    setPreparing(false);

    setUploading(true);
    try {
      const result = await uploadWorkspaceImage(uploadFile, workspaceId, user.id);

      if (!result.success || !result.url) {
        throw new Error(result.error || "Upload failed");
      }

      onUploadComplete(result.url);
      setPreview(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      const errorMessage = getErrorMessage(err, "Failed to upload image");
      setError(errorMessage);
      if (onUploadError) onUploadError(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const clearPreview = () => {
    setPreview(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const maxSizeMB = MAX_IMAGE_SIZE / (1024 * 1024);
  return (
    <div className={`space-y-4 ${className}`} data-max-files={maxFiles}>
      <div>
        <Label htmlFor="image-upload" className="text-sm font-medium">
          Upload Photo
        </Label>
        <p className="text-sm text-muted-foreground mt-1">
          {currentFileCount}/{maxFiles} uploaded. Maximum file size: {maxSizeMB}MB. JPEG, PNG, or WebP.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <input
          ref={fileInputRef}
          id="image-upload"
          type="file"
          accept={ALLOWED_IMAGE_TYPES.join(",")}
          onChange={handleFileSelect}
          disabled={uploading || preparing || limitReached}
          className="hidden"
        />

        {preview ? (
          <div className="relative h-40 w-full overflow-hidden rounded-xl border border-border/35 sm:h-32 sm:w-32">
            <Image
              src={preview}
              alt="Preview"
              fill
              className="object-cover"
              sizes="8rem"
            />
            {!uploading && (
              <button
                onClick={clearPreview}
                type="button"
                className="absolute top-2 right-2 rounded-full bg-destructive p-1 text-destructive-foreground hover:bg-destructive/90"
                aria-label="Remove selected upload"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            {(uploading || preparing) && (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            )}
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || preparing || limitReached}
            className="h-40 w-full flex-col items-center justify-center gap-2 rounded-xl border-border/35 bg-muted/15 text-muted-foreground hover:bg-muted/25 sm:h-32 sm:w-32"
          >
            <Upload className="h-6 w-6" />
            <span className="text-xs">{limitReached ? "Limit reached" : "Choose Photo"}</span>
          </Button>
        )}

        <div className="min-h-5 flex-1">
          {preparing && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Preparing image...
            </div>
          )}
          {uploading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading...
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}
