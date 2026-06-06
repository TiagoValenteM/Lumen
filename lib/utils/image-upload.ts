import { createClient } from "@/lib/supabase/client";
import { getErrorMessage } from "@/lib/utils/error";

export const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB in bytes
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export interface ImageUploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export interface ImageValidationError {
  isValid: false;
  error: string;
}

export interface ImageValidationSuccess {
  isValid: true;
  file: File;
}

export type ImageValidationResult = ImageValidationError | ImageValidationSuccess;

export function validateImage(file: File): ImageValidationResult {
  // Check file type
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      isValid: false,
      error: 'Invalid file type. Please upload a JPEG, PNG, or WebP image.',
    };
  }

  // Check file size (2MB max)
  if (file.size > MAX_IMAGE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    return {
      isValid: false,
      error: `File size (${sizeMB}MB) exceeds the maximum allowed size of 2MB.`,
    };
  }

  return {
    isValid: true,
    file,
  };
}

export async function prepareWorkspaceImageForUpload(file: File): Promise<File> {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type) || file.size <= MAX_IMAGE_SIZE) {
    return file;
  }

  const image = await loadImage(file);
  const maxDimension = 1800;
  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));

  const context = canvas.getContext("2d");
  if (!context) return file;

  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  for (const quality of [0.86, 0.76, 0.66, 0.56]) {
    const blob = await canvasToBlob(canvas, "image/jpeg", quality);
    if (blob.size <= MAX_IMAGE_SIZE) {
      return new File([blob], replaceFileExtension(file.name, "jpg"), {
        lastModified: Date.now(),
        type: "image/jpeg",
      });
    }
  }

  return file;
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read this image."));
    };
    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Could not prepare this image."));
      },
      type,
      quality,
    );
  });
}

function replaceFileExtension(fileName: string, extension: string) {
  return fileName.replace(/\.[^.]+$/, "") + `.${extension}`;
}

export async function uploadWorkspaceImage(
  file: File,
  workspaceId: string,
  userId: string
): Promise<ImageUploadResult> {
  // Validate image first
  const validation = validateImage(file);
  if (!validation.isValid) {
    return {
      success: false,
      error: validation.error,
    };
  }

  const supabase = createClient();

  // Create unique filename
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/${workspaceId}/${Date.now()}.${fileExt}`;

  try {
    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('workspace-photos')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('workspace-photos')
      .getPublicUrl(fileName);

    if (!urlData.publicUrl) {
      throw new Error('Failed to get public URL');
    }

    return {
      success: true,
      url: urlData.publicUrl,
    };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, 'Failed to upload image'),
    };
  }
}

export async function deleteWorkspaceImage(
  imageUrl: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  try {
    // Extract file path from URL
    const url = new URL(imageUrl);
    const pathParts = url.pathname.split('/');
    const fileName = pathParts.slice(-3).join('/'); // userId/workspaceId/filename

    // Verify user owns this image
    if (!fileName.startsWith(userId)) {
      throw new Error('Unauthorized: You can only delete your own images');
    }

    const { error } = await supabase.storage
      .from('workspace-photos')
      .remove([fileName]);

    if (error) {
      throw error;
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, 'Failed to delete image'),
    };
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
