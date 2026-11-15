"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { readWorkspaceCityProposals } from "@/lib/features/locations/workspace-city-proposals";
import { readWorkFactChecks } from "@/lib/features/workspaces/work-fact-checks";
import { Button } from "@/components/ui/button";
import { AccessRestricted, FeedbackState, LoadingState, PageContainer, PageShell } from "@/components/shared/lumen-page";
import { isMissingColumnError, workspaceSelect } from "../_lib/admin-workspace-actions";
import { toWorkspaceForm } from "../_lib/workspace-form";
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
    const { data, error: profileError } = await supabase.rpc("is_admin");
    setIsAdmin(data === true);
    if (profileError) {
      console.error("Failed to load profile", profileError);
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
      const [proposals, checks] = await Promise.all([
        readWorkspaceCityProposals(supabase, row.city_id ? [] : [id]),
        readWorkFactChecks(supabase, { workspaceId: id }),
      ]);
      const proposal = proposals.get(id);
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
        city_name: cityField?.name ?? proposal?.name ?? null,
        work_facts_checked_at: checks.get(id) ?? null,
        country: cityField?.country ?? proposal?.country ?? null,
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
      setForm(toWorkspaceForm(mapped));

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
    return <LoadingState label="Checking access…" />;
  }

  if (!isAdmin) {
    return <AccessRestricted icon={Shield} description="You need admin access to view this preview." />;
  }

  if (loading) {
    return <LoadingState label="Loading saved preview…" />;
  }

  if (!workspace || !form || error) {
    return (
      <PageShell><PageContainer size="md">
        <h1 className="text-3xl font-semibold">Preview unavailable</h1>
        <FeedbackState description={error || "Try returning to the workspace editor."} action={
            <Button asChild variant="outline">
              <Link href={id ? `/admin/workspaces/${id}` : "/admin/workspaces"}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to editor
              </Link>
            </Button>
        } />
      </PageContainer></PageShell>
    );
  }

  return (
    <PageShell>
      <PageContainer size="xl" className="gap-4 py-5 sm:gap-5 sm:py-8">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
          <p className="text-sm font-semibold">Saved admin preview</p>
          <Button asChild variant="outline" className="min-h-11">
            <Link href={`/admin/workspaces/${workspace.id}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to editor
            </Link>
          </Button>
        </div>

        <WorkspacePublishedPreview form={form} photos={photos} workspace={workspace} />
      </PageContainer>
    </PageShell>
  );
}
