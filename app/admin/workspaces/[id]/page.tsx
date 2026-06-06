"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Eye, Loader2, Shield, ArrowLeft, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LocationSection } from "./_components/location-section";
import { PhotoModeration } from "./_components/photo-moderation";
import { SuggestionsPanel } from "./_components/suggestions-panel";
import {
  buildWorkspaceUpdatePayload,
  isMissingColumnError,
  resolveWorkspaceCity,
  setWorkspacePrimaryPhoto,
  STATUS_OPTIONS,
  stripLocationMetadataPayload,
  updateWorkspacePhoto,
  workspaceSelect,
} from "./_lib/admin-workspace-actions";
import type {
  AdminWorkspaceFormState,
  EditSuggestionRow,
  WorkspaceDetailMinimal,
  WorkspacePhotoRow,
  WorkspaceQueryRow,
} from "./_lib/types";

export default function AdminWorkspaceDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params.id[0] : null;
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLocationMetadataColumns, setHasLocationMetadataColumns] = useState(true);
  const [workspace, setWorkspace] = useState<WorkspaceDetailMinimal | null>(null);
  const [photos, setPhotos] = useState<WorkspacePhotoRow[]>([]);
  const [form, setForm] = useState<AdminWorkspaceFormState>({
    name: "",
    short_description: "",
    address: "",
    city_id: null as string | null,
    city_name: "",
    country: "",
    latitude: null as number | null,
    longitude: null as number | null,
    location_source: "manual" as "search" | "pin" | "manual",
    location_provider: null as string | null,
    location_provider_id: null as string | null,
    location_confidence: null as number | null,
    location_raw: null as unknown,
    rejection_reason: "",
    admin_notes: "",
    status: "pending",
  });
  const [suggestions, setSuggestions] = useState<EditSuggestionRow[]>([]);
  const [savingPhotoId, setSavingPhotoId] = useState<string | null>(null);
  const [savingSuggestionId, setSavingSuggestionId] = useState<string | null>(null);

  const statusBadge = useMemo(() => workspace?.status || "pending", [workspace]);

  const loadProfile = useCallback(async () => {
    if (!user) {
      setLoadingProfile(false);
      return;
    }
    setLoadingProfile(true);
    const { data, error: profileError } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) {
      console.error("Failed to load profile", profileError);
    } else {
      setIsAdmin(Boolean(data?.is_admin));
    }
    setLoadingProfile(false);
  }, [supabase, user]);

  const loadWorkspace = useCallback(async () => {
    if (!user || !isAdmin || !id) return;
    setLoading(true);
    setError(null);
    try {
      let includeLocationMetadata = true;
      let { data, error: fetchError } = await supabase
        .from("workspaces")
        .select(workspaceSelect(true))
        .eq("id", id)
        .maybeSingle();
      if (fetchError && isMissingColumnError(fetchError)) {
        includeLocationMetadata = false;
        const fallback = await supabase
          .from("workspaces")
          .select(workspaceSelect(false))
          .eq("id", id)
          .maybeSingle();
        data = fallback.data;
        fetchError = fallback.error;
      }
      if (fetchError) throw fetchError;
      setHasLocationMetadataColumns(includeLocationMetadata);
      if (!data) {
        setError("Workspace not found.");
        setLoading(false);
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

      const { data: suggestionRows, error: suggestionsError } = await supabase
        .from("workspace_edit_suggestions")
        .select("id, created_at, kind, message, status, admin_notes")
        .eq("workspace_id", row.id)
        .order("created_at", { ascending: false });
      if (!suggestionsError) {
        setSuggestions((suggestionRows as EditSuggestionRow[] | null) || []);
      } else if (!isMissingColumnError(suggestionsError)) {
        console.warn("Could not load edit suggestions", suggestionsError);
      }
    } catch (err) {
      console.error("Failed to load workspace", err);
      setError("Could not load workspace. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin, id, supabase]);

  useEffect(() => {
    // Admin profile is loaded from Supabase when the authenticated user changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (isAdmin) {
      // Workspace details are loaded from Supabase after admin access is confirmed.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadWorkspace();
    }
  }, [isAdmin, loadWorkspace]);

  const handleSave = async () => {
    if (!user || !isAdmin || !workspace) return;
    setSaving(true);
    setError(null);
    try {
      if (form.status === "approved" && (form.latitude === null || form.longitude === null)) {
        throw new Error("Approved workspaces need a verified map location.");
      }

      const previousCityId = workspace.city_id;
      const { cityId, citySlug } = await resolveWorkspaceCity(supabase, form, workspace.city_slug);
      const updatePayload = buildWorkspaceUpdatePayload(form, cityId, user.id, hasLocationMetadataColumns);

      let { error: updateError } = await supabase
        .from("workspaces")
        .update(updatePayload)
        .eq("id", workspace.id);
      if (updateError && hasLocationMetadataColumns && isMissingColumnError(updateError)) {
        setHasLocationMetadataColumns(false);
        const fallbackPayload = stripLocationMetadataPayload(updatePayload);
        const fallback = await supabase.from("workspaces").update(fallbackPayload).eq("id", workspace.id);
        updateError = fallback.error;
      }
      if (updateError) throw updateError;
      if (previousCityId && cityId && previousCityId !== cityId) {
        const { error: cleanupError } = await supabase.rpc("delete_city_if_empty", { city_uuid: previousCityId });
        if (cleanupError) {
          console.warn("Workspace moved, but the old empty city could not be cleaned up", cleanupError);
        }
      }
      if (form.status === "approved") {
        const { error: photoError } = await supabase
          .from("workspace_photos")
          .update({ is_approved: true })
          .eq("workspace_id", workspace.id);
        if (photoError) {
          console.warn("Workspace saved, but photos could not be auto-approved", photoError);
        }
      }
      setWorkspace((prev) =>
        prev
          ? {
              ...prev,
              name: form.name,
              short_description: form.short_description,
              address: form.address,
              city_id: cityId,
              city_slug: citySlug,
              city_name: form.city_name,
              country: form.country,
              latitude: form.latitude,
              longitude: form.longitude,
              location_source: form.location_source,
              location_provider: form.location_provider,
              location_provider_id: form.location_provider_id,
              location_confidence: form.location_confidence,
              location_raw: form.location_raw,
              rejection_reason: form.rejection_reason,
              admin_notes: form.admin_notes,
              status: form.status,
            }
          : prev
      );
      router.refresh();
    } catch (err) {
      console.error("Failed to save workspace", err);
      setError(err instanceof Error ? err.message : "Could not save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const updatePhoto = async (photoId: string, next: Partial<WorkspacePhotoRow>) => {
    if (!user || !isAdmin) return;
    setSavingPhotoId(photoId);
    try {
      await updateWorkspacePhoto(supabase, photoId, user.id, next);
      setPhotos((prev) => prev.map((photo) => (photo.id === photoId ? { ...photo, ...next } : photo)));
    } catch (err) {
      console.error("Failed to update photo", err);
      setError("Could not update photo moderation. Please try again.");
    } finally {
      setSavingPhotoId(null);
    }
  };

  const setPrimaryPhoto = async (photoId: string) => {
    if (!workspace) return;
    setSavingPhotoId(photoId);
    try {
      await setWorkspacePrimaryPhoto(supabase, workspace.id, photoId);
      setPhotos((prev) => prev.map((photo) => ({ ...photo, is_primary: photo.id === photoId })));
    } catch (err) {
      console.error("Failed to set primary photo", err);
      setError("Could not set primary photo. Please try again.");
    } finally {
      setSavingPhotoId(null);
    }
  };

  const updateSuggestionStatus = async (suggestionId: string, status: string) => {
    if (!user || !isAdmin) return;
    setSavingSuggestionId(suggestionId);
    try {
      const { error: suggestionError } = await supabase
        .from("workspace_edit_suggestions")
        .update({
          status,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", suggestionId);
      if (suggestionError) throw suggestionError;
      setSuggestions((prev) =>
        prev.map((suggestion) => (suggestion.id === suggestionId ? { ...suggestion, status } : suggestion)),
      );
    } catch (err) {
      console.error("Failed to update suggestion", err);
      setError("Could not update suggestion. Please try again.");
    } finally {
      setSavingSuggestionId(null);
    }
  };

  if (loadingProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Checking access...</span>
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
            <CardDescription>You need admin access to view this page.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/profile">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to profile
              </Link>
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
          <span>Loading workspace...</span>
        </div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Workspace not found</CardTitle>
            <CardDescription>Try returning to the admin list.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/admin/workspaces">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to admin list
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold">Edit workspace</h1>
            <p className="text-muted-foreground text-sm">Admin-only edit for submitted workspaces.</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/admin/workspaces">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to admin list
            </Link>
          </Button>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Card>
          <CardHeader className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {workspace.name}
                <Badge variant="outline" className="capitalize">
                  {statusBadge}
                </Badge>
              </CardTitle>
              <CardDescription>
                {workspace.city_name || "Unspecified city"} · Slug: {workspace.slug}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Workspace name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={form.status}
                  onValueChange={(val) => setForm((prev) => ({ ...prev, status: val }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Short description</Label>
              <Textarea
                value={form.short_description}
                onChange={(e) => setForm((prev) => ({ ...prev, short_description: e.target.value }))}
                placeholder="A concise summary for this workspace"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Reason shown to submitter</Label>
                <Textarea
                  value={form.rejection_reason}
                  onChange={(e) => setForm((prev) => ({ ...prev, rejection_reason: e.target.value }))}
                  placeholder="Explain what needs to change before approval"
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label>Internal admin notes</Label>
                <Textarea
                  value={form.admin_notes}
                  onChange={(e) => setForm((prev) => ({ ...prev, admin_notes: e.target.value }))}
                  placeholder="Private moderation notes"
                  rows={4}
                />
              </div>
            </div>
            <LocationSection form={form} onChange={setForm} />
            <PhotoModeration
              photos={photos}
              workspaceName={workspace.name}
              savingPhotoId={savingPhotoId}
              onUpdatePhoto={updatePhoto}
              onSetPrimaryPhoto={setPrimaryPhoto}
            />
            <SuggestionsPanel
              suggestions={suggestions}
              savingSuggestionId={savingSuggestionId}
              onUpdateStatus={updateSuggestionStatus}
            />
            <div className="flex items-center gap-2">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save changes
              </Button>
              <Button variant="outline" asChild>
                <Link href={`/admin/workspaces/${workspace.id}/preview`} target="_blank">
                  <Eye className="h-4 w-4 mr-2" />
                  Preview page
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href={`/cities/${workspace.city_slug ?? ""}/${workspace.slug}`} target="_blank">
                  Public view
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
