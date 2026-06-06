"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isMissingColumnError, workspaceSelect } from "../_lib/admin-workspace-actions";
import type { AdminWorkspaceFormState, WorkspaceDetailMinimal, WorkspacePhotoRow, WorkspaceQueryRow } from "../_lib/types";
import { WorkspacePublishedPreview } from "../_components/workspace-published-preview";

export default function AdminWorkspacePreviewPage() {
  const { user } = useAuth();
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params.id[0] : null;
  const supabase = useMemo(() => createClient(), []);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceDetailMinimal | null>(null);
  const [form, setForm] = useState<AdminWorkspaceFormState | null>(null);
  const [photos, setPhotos] = useState<WorkspacePhotoRow[]>([]);

  const loadProfile = useCallback(async () => {
    if (!user) {
      setLoadingProfile(false);
      return;
    }

    setLoadingProfile(true);
    const { data, error: profileError } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
    if (profileError) {
      console.error("Failed to load profile", profileError);
    } else {
      setIsAdmin(Boolean(data?.is_admin));
    }
    setLoadingProfile(false);
  }, [supabase, user]);

  const loadPreview = useCallback(async () => {
    if (!user || !isAdmin || !id) return;

    setLoading(true);
    setError(null);
    try {
      let includeLocationMetadata = true;
      let { data, error: fetchError } = await supabase.from("workspaces").select(workspaceSelect(true)).eq("id", id).maybeSingle();

      if (fetchError && isMissingColumnError(fetchError)) {
        includeLocationMetadata = false;
        const fallback = await supabase.from("workspaces").select(workspaceSelect(false)).eq("id", id).maybeSingle();
        data = fallback.data;
        fetchError = fallback.error;
      }

      if (fetchError) throw fetchError;
      if (!data) {
        setError("Workspace not found.");
        return;
      }

      const row = data as unknown as WorkspaceQueryRow;
      const cityField = Array.isArray(row.city) ? row.city[0] ?? null : row.city;
      const mapped: WorkspaceDetailMinimal = {
        ...row,
        id: row.id,
        name: row.name,
        slug: row.slug,
        status: row.status,
        short_description: row.short_description,
        address: row.address,
        city_id: row.city_id,
        submitted_by: row.submitted_by ?? null,
        city_slug: cityField?.slug ?? null,
        city_name: cityField?.name ?? null,
        country: cityField?.country ?? null,
        latitude: row.latitude,
        longitude: row.longitude,
        location_source: includeLocationMetadata ? row.location_source : null,
        location_provider: includeLocationMetadata ? row.location_provider : null,
        location_provider_id: includeLocationMetadata ? row.location_provider_id : null,
        location_confidence: includeLocationMetadata ? row.location_confidence : null,
        location_raw: includeLocationMetadata ? row.location_raw : null,
        rejection_reason: includeLocationMetadata ? row.rejection_reason : null,
        admin_notes: includeLocationMetadata ? row.admin_notes : null,
      };

      setWorkspace(mapped);
      setForm({
        name: mapped.name || "",
        short_description: mapped.short_description || "",
        address: mapped.address || "",
        city_id: mapped.city_id,
        city_name: mapped.city_name || "",
        country: mapped.country || "",
        latitude: mapped.latitude,
        longitude: mapped.longitude,
        location_source: mapped.location_source || "manual",
        location_provider: mapped.location_provider,
        location_provider_id: mapped.location_provider_id,
        location_confidence: mapped.location_confidence,
        location_raw: mapped.location_raw,
        rejection_reason: mapped.rejection_reason || "",
        admin_notes: mapped.admin_notes || "",
        status: mapped.status || "pending",
      });

      const { data: photoRows, error: photosError } = await supabase
        .from("workspace_photos")
        .select("id, url, caption, is_primary, is_approved")
        .eq("workspace_id", row.id)
        .order("is_primary", { ascending: false });
      if (photosError) throw photosError;
      setPhotos((photoRows as WorkspacePhotoRow[] | null) || []);
    } catch (err) {
      console.error("Failed to load workspace preview", err);
      setError("Could not load workspace preview. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [id, isAdmin, supabase, user]);

  useEffect(() => {
    // Admin profile is loaded from Supabase when the authenticated user changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (isAdmin) {
      // Preview details are loaded from Supabase after admin access is confirmed.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadPreview();
    }
  }, [isAdmin, loadPreview]);

  if (loadingProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading preview...</span>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-destructive" />
              Access restricted
            </CardTitle>
            <CardDescription>You need admin access to view this preview.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/profile">Back to profile</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading preview...</span>
        </div>
      </div>
    );
  }

  if (!workspace || !form || error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Preview unavailable</CardTitle>
            <CardDescription>{error || "Try returning to the workspace editor."}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href={id ? `/admin/workspaces/${id}` : "/admin/workspaces"}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to editor
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-3 border-b border-border/30 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">Admin preview</p>
            <h1 className="text-2xl font-semibold tracking-tight">Published page preview</h1>
          </div>
          <Button asChild variant="outline">
            <Link href={`/admin/workspaces/${workspace.id}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to editor
            </Link>
          </Button>
        </div>

        <WorkspacePublishedPreview form={form} photos={photos} workspace={workspace} />
      </div>
    </div>
  );
}
