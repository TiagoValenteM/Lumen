import { createClient } from "@/lib/supabase/client";

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
    const { data: uploadData, error: uploadError } = await supabase.storage
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
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to upload image',
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
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to delete image',
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
