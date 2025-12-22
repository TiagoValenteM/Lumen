# Image Upload Guide

## Requirements

### File Size
- **Maximum size**: 2MB per image
- Files larger than 2MB will be rejected with a clear error message
- Users are informed of the size limit before uploading

### File Types
Accepted formats:
- JPEG (`.jpg`, `.jpeg`)
- PNG (`.png`)
- WebP (`.webp`)

### Placeholder Image
- Location: `/public/placeholder-workspace.jpg`
- Used when a workspace has no photos
- Displayed automatically via `WorkspaceImage` component

## Components

### 1. `WorkspaceImage` Component
Display workspace photos with automatic placeholder fallback.

**Usage:**
```tsx
import { WorkspaceImage } from "@/components/WorkspaceImage";

// With fill (responsive)
<WorkspaceImage
  src={workspace.primary_photo?.url}
  alt={workspace.name}
  fill
  className="object-cover"
/>

// With fixed dimensions
<WorkspaceImage
  src={workspace.primary_photo?.url}
  alt={workspace.name}
  width={400}
  height={300}
  className="rounded-lg"
/>
```

**Features:**
- Automatically uses placeholder if `src` is null/undefined
- Next.js Image optimization
- Responsive sizing support

### 2. `ImageUpload` Component
Upload workspace photos with validation and preview.

**Usage:**
```tsx
import { ImageUpload } from "@/components/ImageUpload";

<ImageUpload
  workspaceId={workspaceId}
  onUploadComplete={(url) => {
    // Handle successful upload
    console.log('Uploaded:', url);
  }}
  onUploadError={(error) => {
    // Handle upload error
    console.error('Upload failed:', error);
  }}
  maxFiles={5}
/>
```

**Features:**
- File validation (size, type)
- Image preview before upload
- Loading states
- Error messages
- User-friendly UI

### 3. Image Upload Utilities
Helper functions for image handling.

**Usage:**
```typescript
import {
  validateImage,
  uploadWorkspaceImage,
  deleteWorkspaceImage,
  formatFileSize,
  MAX_IMAGE_SIZE,
  ALLOWED_IMAGE_TYPES,
} from "@/lib/utils/image-upload";

// Validate before upload
const validation = validateImage(file);
if (!validation.isValid) {
  console.error(validation.error);
  return;
}

// Upload image
const result = await uploadWorkspaceImage(file, workspaceId, userId);
if (result.success) {
  console.log('URL:', result.url);
}

// Delete image
await deleteWorkspaceImage(imageUrl, userId);

// Format file size for display
const sizeText = formatFileSize(file.size); // "1.5 MB"
```

## Storage Structure

Images are organized in Supabase Storage:
```
workspace-photos/
  └── {userId}/
      └── {workspaceId}/
          └── {timestamp}.{ext}
```

**Example:**
```
workspace-photos/
  └── abc123-user-id/
      └── xyz789-workspace-id/
          └── 1703188800000.jpg
```

## Validation Rules

### Client-Side Validation
1. **File type check**: Only JPEG, PNG, WebP allowed
2. **File size check**: Maximum 2MB (2,097,152 bytes)
3. **User feedback**: Clear error messages for validation failures

### Server-Side (Supabase Storage)
- RLS policies ensure users can only upload to their own folders
- Storage bucket policies enforce access control
- Automatic file path validation

## Error Messages

Users will see these error messages:

**Invalid file type:**
```
Invalid file type. Please upload a JPEG, PNG, or WebP image.
```

**File too large:**
```
File size (3.45MB) exceeds the maximum allowed size of 2MB.
```

**Upload failed:**
```
Failed to upload image
```

## Database Integration

After uploading to Storage, create a record in `workspace_photos`:

```typescript
const { data, error } = await supabase
  .from('workspace_photos')
  .insert({
    workspace_id: workspaceId,
    user_id: userId,
    url: uploadedUrl,
    caption: 'Optional caption',
    is_primary: isFirstPhoto, // Auto-set by trigger
    is_approved: false, // Requires admin approval
  });
```

## Placeholder Image Setup

1. **Add a placeholder image** to `/public/placeholder-workspace.jpg`
   - Recommended size: 800x600px
   - Should represent a generic workspace/cafe
   - Can use a free image from Unsplash or create a simple design

2. **Suggested placeholder sources:**
   - Unsplash: https://unsplash.com/s/photos/cafe-workspace
   - Download a generic cafe/coworking image
   - Or create a simple branded placeholder with your logo

## Example: Complete Upload Flow

```tsx
"use client";

import { useState } from "react";
import { ImageUpload } from "@/components/ImageUpload";
import { WorkspaceImage } from "@/components/WorkspaceImage";
import { createClient } from "@/lib/supabase/client";

export function WorkspacePhotoManager({ workspaceId }: { workspaceId: string }) {
  const [photos, setPhotos] = useState<string[]>([]);
  const supabase = createClient();

  const handleUploadComplete = async (url: string) => {
    // Save to database
    const { data, error } = await supabase
      .from('workspace_photos')
      .insert({
        workspace_id: workspaceId,
        url: url,
        is_approved: true, // Auto-approve for demo
      })
      .select()
      .single();

    if (data) {
      setPhotos([...photos, data.url]);
    }
  };

  return (
    <div className="space-y-6">
      <ImageUpload
        workspaceId={workspaceId}
        onUploadComplete={handleUploadComplete}
      />

      <div className="grid grid-cols-3 gap-4">
        {photos.map((photo, index) => (
          <div key={index} className="relative aspect-video">
            <WorkspaceImage
              src={photo}
              alt={`Photo ${index + 1}`}
              fill
              className="rounded-lg object-cover"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Best Practices

1. **Always validate on client-side** before uploading
2. **Show file size limit** prominently in the UI
3. **Provide image preview** before upload
4. **Use placeholder images** for better UX
5. **Compress images** if possible (consider adding image optimization)
6. **Handle errors gracefully** with user-friendly messages
7. **Show upload progress** for better feedback

## Future Enhancements

Consider adding:
- Image cropping/editing before upload
- Multiple file upload at once
- Drag-and-drop support
- Image compression on client-side
- Progress bar for large files
- Automatic image optimization (resize, format conversion)
