"use client";

import { useState, useRef, ChangeEvent } from "react";
import { Upload, X, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  validateImage,
  uploadWorkspaceImage,
  formatFileSize,
  MAX_IMAGE_SIZE,
  ALLOWED_IMAGE_TYPES,
} from "@/lib/utils/image-upload";
import { useAuth } from "@/contexts/AuthContext";

interface ImageUploadProps {
  workspaceId: string;
  onUploadComplete: (url: string) => void;
  onUploadError?: (error: string) => void;
  maxFiles?: number;
  className?: string;
}

export function ImageUpload({
  workspaceId,
  onUploadComplete,
  onUploadError,
  maxFiles = 5,
  className = "",
}: ImageUploadProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setError(null);
    setPreview(null);

    // Validate image
    const validation = validateImage(file);
    if (!validation.isValid) {
      setError(validation.error);
      if (onUploadError) onUploadError(validation.error);
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload image
    setUploading(true);
    try {
      const result = await uploadWorkspaceImage(file, workspaceId, user.id);

      if (!result.success || !result.url) {
        throw new Error(result.error || "Upload failed");
      }

      onUploadComplete(result.url);
      setPreview(null);
      
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err: any) {
      const errorMessage = err.message || "Failed to upload image";
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
  const acceptedTypes = ALLOWED_IMAGE_TYPES.join(", ");

  return (
    <div className={`space-y-4 ${className}`}>
      <div>
        <Label htmlFor="image-upload" className="text-sm font-medium">
          Upload Photo
        </Label>
        <p className="text-sm text-muted-foreground mt-1">
          Maximum file size: {maxSizeMB}MB. Accepted formats: JPEG, PNG, WebP
        </p>
      </div>

      <div className="flex items-center gap-4">
        <input
          ref={fileInputRef}
          id="image-upload"
          type="file"
          accept={ALLOWED_IMAGE_TYPES.join(",")}
          onChange={handleFileSelect}
          disabled={uploading}
          className="hidden"
        />

        {preview ? (
          <div className="relative w-32 h-32 rounded-lg overflow-hidden border">
            <img
              src={preview}
              alt="Preview"
              className="w-full h-full object-cover"
            />
            {!uploading && (
              <button
                onClick={clearPreview}
                className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            {uploading && (
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
            disabled={uploading}
            className="w-32 h-32 flex flex-col items-center justify-center gap-2"
          >
            <Upload className="h-6 w-6" />
            <span className="text-xs">Choose Photo</span>
          </Button>
        )}

        <div className="flex-1">
          {uploading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading...
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}
