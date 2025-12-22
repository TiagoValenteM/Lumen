# Supabase Database Setup Instructions

## Step 1: Run Main SQL Migration

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/kcmksmoicpgjfbufliwd
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the entire contents of `/supabase/migrations/001_create_workspaces_schema.sql`
5. Paste into the SQL Editor
6. Click **Run** (or press Cmd/Ctrl + Enter)

This will create:
- ✅ All 6 tables (workspaces, cities, reviews, workspace_photos, saved_workspaces, profiles)
- ✅ Enum types
- ✅ Indexes for performance
- ✅ Triggers for auto-updates
- ✅ Row Level Security policies

## Step 2: Run Helper Functions Migration

After the main migration succeeds, run the helper functions:

1. In the same **SQL Editor**, click **New Query** (or clear the previous query)
2. Copy the entire contents of `/supabase/migrations/002_workspace_helpers.sql`
3. Paste into the SQL Editor
4. Click **Run**

This will create:
- ✅ `workspace_cards` view - Pre-joined workspaces with cities and primary photos
- ✅ `get_workspace_primary_photo()` function - Helper to get primary photo URL
- ✅ `set_primary_photo()` function - Helper to set a photo as primary
- ✅ Auto-trigger to set first uploaded photo as primary

**Why separate?** The helper functions depend on tables existing first, so they must run after the main migration.

## Step 2b: Run Workspace Count Trigger Migration

Run this migration to automatically update city workspace counts:

1. In **SQL Editor**, click **New Query**
2. Copy the entire contents of `/supabase/migrations/003_workspace_count_trigger.sql`
3. Paste into the SQL Editor
4. Click **Run**

This will create:
- ✅ Auto-trigger to update `workspace_count` when workspaces are added/deleted/moved
- ✅ Initializes counts for existing cities
- ✅ Handles city changes automatically

## Step 3: Seed Sample Data (Optional)

To add sample cities and workspaces for testing:

1. In **SQL Editor**, click **New Query**
2. Copy the entire contents of `/supabase/seed_data.sql`
3. Paste into the SQL Editor
4. Click **Run**

This will add:
- ✅ 7 cities (Lisbon, Porto, Barcelona, Madrid, Paris, Berlin, Amsterdam)
- ✅ 4 sample workspaces with full details
- ✅ 7 sample photos (using Unsplash placeholders)
- ✅ Each workspace has at least one primary photo

**Note:** You can skip this step if you want to add your own data manually.

## Step 4: Create Storage Bucket for Photos

1. In Supabase Dashboard, go to **Storage** in the left sidebar
2. Click **New bucket**
3. Name: `workspace-photos`
4. Set to **Public bucket** (check the box)
5. Click **Create bucket**

### Set Storage Policies

After creating the bucket, set up these policies:

```sql
-- Allow public read access to all photos
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'workspace-photos' );

-- Allow authenticated users to upload photos
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'workspace-photos' 
  AND auth.role() = 'authenticated'
);

-- Allow users to update their own uploads
CREATE POLICY "Users can update own uploads"
ON storage.objects FOR UPDATE
USING ( 
  bucket_id = 'workspace-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete own uploads"
ON storage.objects FOR DELETE
USING ( 
  bucket_id = 'workspace-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

## Step 5: Verify Tables Created

Run this query to verify all tables exist:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

You should see:
- cities
- profiles
- reviews
- saved_workspaces
- workspace_photos
- workspaces

## Step 6: Test Photo Upload (Optional)

You can test uploading a photo via the Supabase Storage UI:
1. Go to Storage → workspace-photos
2. Click Upload file
3. Upload a test image

The URL format will be:
```
https://kcmksmoicpgjfbufliwd.supabase.co/storage/v1/object/public/workspace-photos/[filename]
```

## Important Notes

### Primary Photo Requirement
- Each workspace should have at least one photo with `is_primary = true`
- When displaying workspace cards, query for the primary photo:
  ```typescript
  const { data } = await supabase
    .from('workspaces')
    .select(`
      *,
      workspace_photos!inner(url, is_primary)
    `)
    .eq('workspace_photos.is_primary', true)
    .eq('status', 'approved');
  ```

### Photo Upload Flow
1. User uploads photo to Storage bucket
2. Create record in `workspace_photos` table with the storage URL
3. Set `is_primary = true` for the main photo
4. Set `is_approved = true` (or require admin approval)

### Fallback Images
If a workspace has no photos, use a placeholder:
- Create a `public/placeholder-cafe.jpg` in your project
- Or use a service like Unsplash for default images

## Troubleshooting

**Error: "relation cities does not exist"**
- The migration creates `workspaces` table with a foreign key to `cities`
- Make sure the entire SQL file runs successfully
- If it fails, drop all tables and run again

**Error: "extension uuid-ossp does not exist"**
- This should be enabled by default in Supabase
- If not, enable it manually: `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`

**Storage bucket not accessible**
- Make sure the bucket is set to **Public**
- Verify RLS policies are created correctly
- Check bucket name matches exactly: `workspace-photos`
