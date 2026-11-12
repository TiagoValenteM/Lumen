"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getErrorMessage } from "@/lib/utils/error";
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
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Eye, Loader2, Shield, ArrowLeft, Save, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AdminWorkDetailsSection } from "./_components/admin-work-details-section";
import { AiEnrichmentPanel } from "./_components/ai-enrichment-panel";
import { LocationSection } from "./_components/location-section";
import { PhotoModeration } from "./_components/photo-moderation";
import { SuggestionsPanel } from "./_components/suggestions-panel";
import {
  buildWorkspaceUpdatePayload,
  createWorkspacePhoto,
  deleteWorkspace,
  deleteWorkspacePhoto,
  deleteWorkspacePhotoStorageObject,
  isMissingColumnError,
  resolveWorkspaceCity,
  setWorkspacePrimaryPhoto,
  STATUS_OPTIONS,
  stripLocationMetadataPayload,
  updateWorkspacePhoto,
  WORKSPACE_TYPE_OPTIONS,
  workspaceSelect,
} from "./_lib/admin-workspace-actions";
import type {
  AdminWorkspaceFormState,
  AiEnrichmentRow,
  AiRunMode,
  EditSuggestionRow,
  WorkspaceDetailMinimal,
  WorkspacePhotoRow,
  WorkspaceQueryRow,
} from "./_lib/types";

const AI_ACTIVE_STATUSES = new Set(["queued", "researching", "extracting", "pending"]);
const AI_REVIEWABLE_STATUSES = new Set(["ready_for_review", "completed"]);
const AI_ENRICHMENT_SELECT = "id, created_at, updated_at, status, provider, model, run_mode, suggested_fields, field_evidence, unknown_fields, field_decisions, run_metadata, field_sources, citations, error_message";

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
  const [validationError, setValidationError] = useState<string | null>(null);
  const [hasLocationMetadataColumns, setHasLocationMetadataColumns] = useState(true);
  const [workspace, setWorkspace] = useState<WorkspaceDetailMinimal | null>(null);
  const [photos, setPhotos] = useState<WorkspacePhotoRow[]>([]);
  const [form, setForm] = useState<AdminWorkspaceFormState>({
    name: "",
    type: "cafe",
    short_description: "",
    description: "",
    address: "",
    website: "",
    phone: "",
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
    has_wifi: false,
    wifi_speed: "",
    has_power_outlets: false,
    power_outlet_availability: 0,
    seating_capacity: 0,
    seating_comfort: "",
    has_outdoor_seating: false,
    has_standing_desks: false,
    noise_level: "",
    music_volume: 0,
    has_natural_light: false,
    has_air_conditioning: false,
    has_heating: false,
    has_restrooms: false,
    has_parking: false,
    has_bike_parking: false,
    is_accessible: false,
    allows_pets: false,
    has_food: false,
    has_veg: false,
    has_coffee: false,
    has_alcohol: false,
    price_range: 0,
    laptop_friendly: true,
    time_limit_hours: 0,
    minimum_purchase_required: false,
    good_for_meetings: false,
    good_for_calls: false,
    good_for_groups: false,
  });
  const [aiEnrichments, setAiEnrichments] = useState<AiEnrichmentRow[]>([]);
  const [runningAiEnrichment, setRunningAiEnrichment] = useState(false);
  const [aiEnrichmentError, setAiEnrichmentError] = useState<string | null>(null);
  const [aiStagedMessage, setAiStagedMessage] = useState<string | null>(null);
  const [stagedAiReview, setStagedAiReview] = useState<{ id: string; paths: string[] } | null>(null);
  const [rejectingAiFields, setRejectingAiFields] = useState(false);
  const [discardingAiEnrichment, setDiscardingAiEnrichment] = useState(false);
  const hasStagedAiChanges = Boolean(aiStagedMessage);
  const [suggestions, setSuggestions] = useState<EditSuggestionRow[]>([]);
  const [savingPhotoId, setSavingPhotoId] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [savingSuggestionId, setSavingSuggestionId] = useState<string | null>(null);
  const [deleteWorkspaceDialogOpen, setDeleteWorkspaceDialogOpen] = useState(false);
  const [deletingWorkspace, setDeletingWorkspace] = useState(false);

  const statusBadge = useMemo(() => workspace?.status || "pending", [workspace]);
  const approvalNeedsLocation = form.status === "approved" && (form.latitude === null || form.longitude === null);
  const latestAiStatus = aiEnrichments[0]?.status;
  const latestAiUpdate = aiEnrichments[0]?.updated_at ?? aiEnrichments[0]?.created_at;

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
      const notes = await supabase.rpc("get_workspace_admin_notes", { workspace_uuid: id });
      if (notes.error && notes.error.code !== "PGRST202") throw notes.error;
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
        admin_notes: notes.error ? row.admin_notes ?? null : notes.data,
      };
      setWorkspace(mapped);
      setForm({
        name: mapped.name || "",
        type: mapped.type || "cafe",
        short_description: mapped.short_description || "",
        description: mapped.description || "",
        address: mapped.address || "",
        website: mapped.website || "",
        phone: mapped.phone || "",
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
        has_wifi: Boolean(mapped.has_wifi),
        wifi_speed: mapped.wifi_speed || "",
        has_power_outlets: Boolean(mapped.has_power_outlets),
        power_outlet_availability: Number(mapped.power_outlet_availability || 0),
        seating_capacity: Number(mapped.seating_capacity || 0),
        seating_comfort: mapped.seating_comfort || "",
        has_outdoor_seating: Boolean(mapped.has_outdoor_seating),
        has_standing_desks: Boolean(mapped.has_standing_desks),
        noise_level: mapped.noise_level || "",
        music_volume: Number(mapped.music_volume || 0),
        has_natural_light: Boolean(mapped.has_natural_light),
        has_air_conditioning: Boolean(mapped.has_air_conditioning),
        has_heating: Boolean(mapped.has_heating),
        has_restrooms: Boolean(mapped.has_restrooms),
        has_parking: Boolean(mapped.has_parking),
        has_bike_parking: Boolean(mapped.has_bike_parking),
        is_accessible: Boolean(mapped.is_accessible),
        allows_pets: Boolean(mapped.allows_pets),
        has_food: Boolean(mapped.has_food),
        has_veg: Boolean(mapped.has_veg),
        has_coffee: Boolean(mapped.has_coffee),
        has_alcohol: Boolean(mapped.has_alcohol),
        price_range: Number(mapped.price_range || 0),
        laptop_friendly: mapped.laptop_friendly ?? true,
        time_limit_hours: Number(mapped.time_limit_hours || 0),
        minimum_purchase_required: Boolean(mapped.minimum_purchase_required),
        good_for_meetings: Boolean(mapped.good_for_meetings),
        good_for_calls: Boolean(mapped.good_for_calls),
        good_for_groups: Boolean(mapped.good_for_groups),
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
        .select("id, created_at, kind, message, status")
        .eq("workspace_id", row.id)
        .order("created_at", { ascending: false });
      if (!suggestionsError) {
        setSuggestions((suggestionRows as EditSuggestionRow[] | null) || []);
      } else if (!isMissingColumnError(suggestionsError)) {
        console.warn("Could not load edit suggestions", suggestionsError);
      }

      const { data: enrichmentRows, error: enrichmentError } = await supabase
        .from("workspace_ai_enrichments")
        .select(AI_ENRICHMENT_SELECT)
        .eq("workspace_id", row.id)
        .order("created_at", { ascending: false });
      if (!enrichmentError) {
        setAiEnrichments((enrichmentRows as AiEnrichmentRow[] | null) || []);
      } else if (!isMissingColumnError(enrichmentError)) {
        console.warn("Could not load AI enrichment", enrichmentError);
      }
      setAiStagedMessage(null);
      setStagedAiReview(null);
    } catch (err) {
      console.error("Failed to load workspace", err);
      setError("Could not load workspace. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin, id, supabase]);

  const refreshAiEnrichments = useCallback(
    async (workspaceId: string) => {
      const { data, error: enrichmentError } = await supabase
        .from("workspace_ai_enrichments")
        .select(AI_ENRICHMENT_SELECT)
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });

      if (!enrichmentError) {
        setAiEnrichments((data as AiEnrichmentRow[] | null) || []);
        return;
      }

      if (!isMissingColumnError(enrichmentError)) {
        console.warn("Could not refresh AI enrichment", enrichmentError);
      }
    },
    [supabase],
  );

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

  useEffect(() => {
    if (!workspace?.id || !AI_ACTIVE_STATUSES.has(String(latestAiStatus))) return;

    const workspaceId = workspace.id;
    let cancelled = false;
    let timer: number | undefined;
    async function poll() {
      if (latestAiUpdate && Date.now() - Date.parse(latestAiUpdate) >= 180_000) {
        await fetch(`/api/workspaces/${workspaceId}/enrich`, { cache: "no-store" }).catch(() => null);
      }
      if (cancelled) return;
      await refreshAiEnrichments(workspaceId);
      if (!cancelled) timer = window.setTimeout(poll, 4000);
    }
    timer = window.setTimeout(poll, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [latestAiStatus, latestAiUpdate, refreshAiEnrichments, workspace?.id]);

  const handleSave = async () => {
    if (!user || !isAdmin || !workspace || saving || rejectingAiFields || discardingAiEnrichment) return;
    setSaving(true);
    setError(null);
    setValidationError(null);
    if (approvalNeedsLocation) {
      setSaving(false);
      setValidationError("Approved workspaces need a verified map location. Search for the place or drop a pin before saving as approved.");
      return;
    }

    try {
      const previousCityId = workspace.city_id;
      const { cityId, citySlug } = await resolveWorkspaceCity(supabase, form, workspace.city_slug);
      const updatePayload = buildWorkspaceUpdatePayload(form, cityId, user.id, hasLocationMetadataColumns);

      if (stagedAiReview) {
        const { error: updateError } = await supabase.rpc("save_workspace_ai_review", {
          workspace_uuid: workspace.id,
          enrichment_uuid: stagedAiReview.id,
          patch: updatePayload,
          applied_paths: stagedAiReview.paths,
        });
        if (updateError) throw new Error(updateError.message);
      } else {
        let { error: updateError } = await supabase
          .from("workspaces")
          .update(updatePayload)
          .eq("id", workspace.id)
          .select("id")
          .single();
        if (updateError && hasLocationMetadataColumns && isMissingColumnError(updateError)) {
          setHasLocationMetadataColumns(false);
          const fallback = await supabase.from("workspaces")
            .update(stripLocationMetadataPayload(updatePayload)).eq("id", workspace.id).select("id").single();
          updateError = fallback.error;
        }
        if (updateError) throw new Error(updateError.message);
      }
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
          .eq("workspace_id", workspace.id)
          .is("reviewed_at", null);
        if (photoError) {
          console.warn("Workspace saved, but photos could not be auto-approved", photoError);
        }
      }
      setWorkspace((prev) =>
        prev
          ? {
              ...prev,
              name: form.name,
              type: form.type,
              short_description: form.short_description,
              description: form.description,
              address: form.address,
              website: form.website,
              phone: form.phone,
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
              has_wifi: form.has_wifi,
              wifi_speed: form.wifi_speed,
              has_power_outlets: form.has_power_outlets,
              power_outlet_availability: form.power_outlet_availability,
              seating_capacity: form.seating_capacity,
              seating_comfort: form.seating_comfort,
              has_outdoor_seating: form.has_outdoor_seating,
              has_standing_desks: form.has_standing_desks,
              noise_level: form.noise_level,
              music_volume: form.music_volume,
              has_natural_light: form.has_natural_light,
              has_air_conditioning: form.has_air_conditioning,
              has_heating: form.has_heating,
              has_restrooms: form.has_restrooms,
              has_parking: form.has_parking,
              has_bike_parking: form.has_bike_parking,
              is_accessible: form.is_accessible,
              allows_pets: form.allows_pets,
              has_food: form.has_food,
              has_veg: form.has_veg,
              has_coffee: form.has_coffee,
              has_alcohol: form.has_alcohol,
              price_range: form.price_range,
              laptop_friendly: form.laptop_friendly,
              time_limit_hours: form.time_limit_hours,
              minimum_purchase_required: form.minimum_purchase_required,
              good_for_meetings: form.good_for_meetings,
              good_for_calls: form.good_for_calls,
              good_for_groups: form.good_for_groups,
            }
          : prev
      );
      if (stagedAiReview) {
        setAiEnrichments((prev) => prev.map((run) => run.id === stagedAiReview.id
          ? { ...run, status: "applied" }
          : run));
      }
      setAiStagedMessage(null);
      setStagedAiReview(null);
      router.refresh();
    } catch (err) {
      console.error("Failed to save workspace", err);
      setError(getErrorMessage(err, "Could not save changes. Please try again."));
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

  const addUploadedPhoto = async (url: string) => {
    if (!workspace || !user || !isAdmin) return;
    setUploadingPhoto(true);
    setError(null);
    try {
      const newPhoto = await createWorkspacePhoto(supabase, workspace.id, user.id, url, photos.length === 0);
      setPhotos((prev) => {
        const next = newPhoto.is_primary ? prev.map((photo) => ({ ...photo, is_primary: false })) : prev;
        return [...next, newPhoto];
      });
    } catch (err) {
      console.error("Failed to add uploaded photo", err);
      setError(err instanceof Error ? err.message : "The image uploaded, but could not be attached to this workspace.");
      try {
        await deleteWorkspacePhotoStorageObject(supabase, url);
      } catch (storageError) {
        console.warn("Uploaded photo row failed, and storage cleanup failed", storageError);
      }
    } finally {
      setUploadingPhoto(false);
    }
  };

  const removePhoto = async (photo: WorkspacePhotoRow) => {
    if (!user || !isAdmin) return;
    setSavingPhotoId(photo.id);
    setError(null);
    try {
      await deleteWorkspacePhoto(supabase, photo.id);
      setPhotos((prev) => prev.filter((existingPhoto) => existingPhoto.id !== photo.id));
      try {
        await deleteWorkspacePhotoStorageObject(supabase, photo.url);
      } catch (storageError) {
        console.warn("Photo row deleted, but storage cleanup failed", storageError);
      }
    } catch (err) {
      console.error("Failed to delete photo", err);
      setError(err instanceof Error ? err.message : "Could not delete photo. Please try again.");
    } finally {
      setSavingPhotoId(null);
    }
  };

  const removeWorkspace = async () => {
    if (!workspace || !user || !isAdmin) return;
    setDeletingWorkspace(true);
    setError(null);
    try {
      await deleteWorkspace(supabase, workspace.id);
      await Promise.allSettled(photos.map((photo) => deleteWorkspacePhotoStorageObject(supabase, photo.url)));
      router.push("/admin/workspaces");
      router.refresh();
    } catch (err) {
      console.error("Failed to delete workspace", err);
      setError(err instanceof Error ? err.message : "Could not delete workspace. Please try again.");
      setDeletingWorkspace(false);
      setDeleteWorkspaceDialogOpen(false);
    }
  };

  const runAiEnrichment = async (mode: AiRunMode = "full") => {
    if (!workspace || runningAiEnrichment || stagedAiReview || AI_ACTIVE_STATUSES.has(String(latestAiStatus))) return;
    setRunningAiEnrichment(true);
    setAiEnrichmentError(null);
    try {
      const response = await fetch(`/api/workspaces/${workspace.id}/enrich`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true, mode }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || result?.ok === false || result?.skipped) {
        const message = result?.error || `AI enrichment did not complete. Server returned ${response.status}.`;
        setAiEnrichmentError(message);
        console.warn("AI enrichment did not complete", result);
        await refreshAiEnrichments(workspace.id);
        return;
      }
      await refreshAiEnrichments(workspace.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not run AI enrichment.";
      setAiEnrichmentError(message);
      console.warn("Failed to run AI enrichment", err);
      await refreshAiEnrichments(workspace.id);
    } finally {
      setRunningAiEnrichment(false);
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

  const applySelectedAiFields = (
    fields: NonNullable<AiEnrichmentRow["suggested_fields"]>,
    fieldPaths: string[],
  ) => {
    const latest = aiEnrichments[0];
    if (!latest || !AI_REVIEWABLE_STATUSES.has(String(latest.status)) || saving || rejectingAiFields || discardingAiEnrichment) return;
    if (stagedAiReview && stagedAiReview.id !== latest.id) return;
    const newPaths = fieldPaths.filter((path) => !stagedAiReview?.paths.includes(path));
    if (!newPaths.length) return;
    const paths = [...(stagedAiReview?.paths ?? []), ...newPaths];
    setForm((prev) => applyAiFieldPaths(prev, fields, newPaths));
    setStagedAiReview({ id: latest.id, paths });
    setAiStagedMessage(`${paths.length} AI suggestion${paths.length === 1 ? " is" : "s are"} staged. Save changes to update the preview.`);
  };

  const rejectAiFields = async (fieldPaths: string[]) => {
    const latest = aiEnrichments[0];
    if (!workspace || !latest || !fieldPaths.length || rejectingAiFields || saving || discardingAiEnrichment) return;
    setRejectingAiFields(true);
    setAiEnrichmentError(null);
    try {
      const response = await fetch(`/api/workspaces/${workspace.id}/enrich/${latest.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field_decisions: Object.fromEntries(fieldPaths.map((path) => [path, "rejected"])) }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || result?.ok === false) {
        throw new Error(result?.error || "Could not save AI review decisions.");
      }
      await refreshAiEnrichments(workspace.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save AI review decisions.";
      setAiEnrichmentError(message);
    } finally {
      setRejectingAiFields(false);
    }
  };

  const discardAiEnrichment = async (enrichmentId: string) => {
    if (!workspace || stagedAiReview || saving || rejectingAiFields || discardingAiEnrichment) return;
    setDiscardingAiEnrichment(true);
    setAiEnrichmentError(null);
    try {
      const response = await fetch(`/api/workspaces/${workspace.id}/enrich/${enrichmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "dismissed" }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || result?.ok === false) {
        throw new Error(result?.error || "Could not discard AI suggestions.");
      }
      await refreshAiEnrichments(workspace.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not discard AI suggestions.";
      setAiEnrichmentError(message);
    } finally {
      setDiscardingAiEnrichment(false);
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
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              onClick={handleSave}
              disabled={saving || rejectingAiFields || discardingAiEnrichment}
              className="inline-flex items-center gap-2"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save changes
            </Button>
            <SavedPreviewButton workspaceId={workspace.id} disabled={hasStagedAiChanges} />
            <Button asChild variant="outline">
              <Link href="/admin/workspaces">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Link>
            </Button>
          </div>
        </div>

        {error && (
          <p className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <Card className="border-primary/20 bg-card/95 py-5 shadow-sm shadow-black/5">
          <CardContent className="px-5">
            <AiEnrichmentPanel
              enrichments={aiEnrichments}
              currentValues={form}
              running={runningAiEnrichment}
              runError={aiEnrichmentError}
              onApplySelected={applySelectedAiFields}
              onRejectSelected={rejectAiFields}
              onDiscard={discardAiEnrichment}
              discarding={discardingAiEnrichment}
              onRun={runAiEnrichment}
              stagedMessage={aiStagedMessage}
              stagedPaths={stagedAiReview?.paths ?? []}
              reviewBusy={saving || rejectingAiFields || discardingAiEnrichment}
            />
          </CardContent>
        </Card>

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
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Workspace name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Type</label>
                <Select
                  value={form.type}
                  onValueChange={(val) => setForm((prev) => ({ ...prev, type: val }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {WORKSPACE_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={form.status}
                  onValueChange={(val) => {
                    setForm((prev) => ({ ...prev, status: val }));
                    if (val !== "approved") setValidationError(null);
                  }}
                >
                  <SelectTrigger aria-label="Workspace status">
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
            <div className="space-y-2">
              <Label>Full description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Longer public description for the workspace page"
                rows={5}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Website</Label>
                <Input
                  value={form.website}
                  onChange={(e) => setForm((prev) => ({ ...prev, website: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="+351 123 456 789"
                />
              </div>
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
            {validationError && (
              <p className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {validationError}
              </p>
            )}
            <AdminWorkDetailsSection form={form} onChange={(updater) => setForm(updater)} />
            {hasStagedAiChanges && (
              <p className="rounded-md border border-primary/15 bg-primary/5 px-3 py-2 text-sm text-muted-foreground">
                AI suggestions are staged in this form. Save changes before opening the saved preview or public page.
              </p>
            )}
            <LocationSection
              form={form}
              onChange={(updater) => {
                setForm((prev) => {
                  const next = updater(prev);
                  if (next.latitude !== null && next.longitude !== null) setValidationError(null);
                  return next;
                });
              }}
              error={approvalNeedsLocation ? validationError : null}
            />
            <PhotoModeration
              photos={photos}
              workspaceId={workspace.id}
              workspaceName={workspace.name}
              savingPhotoId={savingPhotoId}
              uploadingPhoto={uploadingPhoto}
              onPhotoUploaded={addUploadedPhoto}
              onPhotoUploadError={setError}
              onUpdatePhoto={updatePhoto}
              onSetPrimaryPhoto={setPrimaryPhoto}
              onDeletePhoto={removePhoto}
            />
            <SuggestionsPanel
              suggestions={suggestions}
              savingSuggestionId={savingSuggestionId}
              onUpdateStatus={updateSuggestionStatus}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={handleSave}
                disabled={saving || rejectingAiFields || discardingAiEnrichment}
                className="inline-flex items-center gap-2"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save changes
              </Button>
              <SavedPublicViewButton
                citySlug={workspace.city_slug}
                hasStagedChanges={hasStagedAiChanges}
                isPublic={workspace.status === "approved" && Boolean(workspace.city_slug)}
                workspaceSlug={workspace.slug}
              />
              <SavedPreviewButton workspaceId={workspace.id} disabled={hasStagedAiChanges} />
              <Button
                type="button"
                variant="destructive"
                className="sm:ml-auto"
                onClick={() => setDeleteWorkspaceDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete place
              </Button>
            </div>
          </CardContent>
        </Card>
        <Dialog open={deleteWorkspaceDialogOpen} onOpenChange={setDeleteWorkspaceDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete this place?</DialogTitle>
              <DialogDescription>
                This permanently removes {workspace.name} and its related photos, suggestions, saves, visits, and reviews from Lumen.
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">{workspace.name}</p>
              <p>{workspace.address || "No address"}</p>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={deletingWorkspace}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="button" variant="destructive" disabled={deletingWorkspace} onClick={removeWorkspace}>
                {deletingWorkspace ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                Delete place
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function SavedPreviewButton({ disabled, workspaceId }: { disabled: boolean; workspaceId: string }) {
  if (disabled) {
    return (
      <Button
        type="button"
        variant="outline"
        disabled
        title="Save AI-applied changes before opening the saved preview."
      >
        <Eye className="h-4 w-4 mr-2" />
        Save before preview
      </Button>
    );
  }

  return (
    <Button variant="outline" asChild>
      <Link href={`/admin/workspaces/${workspaceId}/preview`} target="_blank">
        <Eye className="h-4 w-4 mr-2" />
        Admin preview
      </Link>
    </Button>
  );
}

function SavedPublicViewButton({
  citySlug,
  hasStagedChanges,
  isPublic,
  workspaceSlug,
}: {
  citySlug: string | null;
  hasStagedChanges: boolean;
  isPublic: boolean;
  workspaceSlug: string;
}) {
  if (hasStagedChanges || !isPublic) {
    return (
      <Button
        type="button"
        variant="outline"
        disabled
        title={
          hasStagedChanges
            ? "Save changes before opening the public view."
            : "The public view is available after this workspace is approved and saved."
        }
      >
        {hasStagedChanges ? "Save before public" : "Public after approval"}
      </Button>
    );
  }

  return (
    <Button variant="outline" asChild>
      <Link href={`/cities/${citySlug ?? ""}/${workspaceSlug}`} target="_blank">
        Public view
      </Link>
    </Button>
  );
}

function applyAiWorkDetails(
  form: AdminWorkspaceFormState,
  fields: Record<string, string | number | boolean | null>,
): AdminWorkspaceFormState {
  return {
    ...form,
    has_wifi: getBooleanField(fields, "has_wifi", form.has_wifi),
    wifi_speed: getStringField(fields, "wifi_speed", form.wifi_speed),
    has_power_outlets: getBooleanField(fields, "has_power_outlets", form.has_power_outlets),
    power_outlet_availability: getNumberField(fields, "power_outlet_availability", form.power_outlet_availability),
    seating_capacity: getNumberField(fields, "seating_capacity", form.seating_capacity),
    seating_comfort: getStringField(fields, "seating_comfort", form.seating_comfort),
    has_outdoor_seating: getBooleanField(fields, "has_outdoor_seating", form.has_outdoor_seating),
    has_standing_desks: getBooleanField(fields, "has_standing_desks", form.has_standing_desks),
    noise_level: getStringField(fields, "noise_level", form.noise_level),
    music_volume: getNumberField(fields, "music_volume", form.music_volume),
    has_natural_light: getBooleanField(fields, "has_natural_light", form.has_natural_light),
    has_air_conditioning: getBooleanField(fields, "has_air_conditioning", form.has_air_conditioning),
    has_heating: getBooleanField(fields, "has_heating", form.has_heating),
    has_restrooms: getBooleanField(fields, "has_restrooms", form.has_restrooms),
    has_parking: getBooleanField(fields, "has_parking", form.has_parking),
    has_bike_parking: getBooleanField(fields, "has_bike_parking", form.has_bike_parking),
    is_accessible: getBooleanField(fields, "is_accessible", form.is_accessible),
    allows_pets: getBooleanField(fields, "allows_pets", form.allows_pets),
    has_food: getBooleanField(fields, "has_food", form.has_food),
    has_veg: getBooleanField(fields, "has_veg", form.has_veg),
    has_coffee: getBooleanField(fields, "has_coffee", form.has_coffee),
    has_alcohol: getBooleanField(fields, "has_alcohol", form.has_alcohol),
    price_range: getNumberField(fields, "price_range", form.price_range),
    laptop_friendly: getBooleanField(fields, "laptop_friendly", form.laptop_friendly),
    time_limit_hours: getNumberField(fields, "time_limit_hours", form.time_limit_hours),
    minimum_purchase_required: getBooleanField(fields, "minimum_purchase_required", form.minimum_purchase_required),
    good_for_meetings: getBooleanField(fields, "good_for_meetings", form.good_for_meetings),
    good_for_calls: getBooleanField(fields, "good_for_calls", form.good_for_calls),
    good_for_groups: getBooleanField(fields, "good_for_groups", form.good_for_groups),
  };
}

function applyAiFieldPaths(
  form: AdminWorkspaceFormState,
  fields: NonNullable<AiEnrichmentRow["suggested_fields"]>,
  fieldPaths: string[],
): AdminWorkspaceFormState {
  const selected = new Set(fieldPaths);
  const next = { ...form };
  const core = fields.core_details;

  if (core) {
    if (selected.has("core_details.name") && core.name) next.name = core.name;
    if (selected.has("core_details.type") && core.type) next.type = core.type;
    if (selected.has("core_details.address") && core.address) next.address = core.address;
    if (selected.has("core_details.city") && core.city) next.city_name = core.city;
    if (selected.has("core_details.country") && core.country) next.country = core.country;
    if (selected.has("core_details.latitude") && typeof core.latitude === "number") next.latitude = core.latitude;
    if (selected.has("core_details.longitude") && typeof core.longitude === "number") next.longitude = core.longitude;

    const hasSelectedCoordinates =
      selected.has("core_details.latitude") &&
      selected.has("core_details.longitude") &&
      typeof core.latitude === "number" &&
      typeof core.longitude === "number";
    if (hasSelectedCoordinates) {
      next.location_source = "search";
      next.location_provider = "ai_enrichment";
      next.location_confidence = 0.7;
    }
  }

  if (selected.has("short_description") && fields.short_description) {
    next.short_description = fields.short_description;
  }
  if (selected.has("description") && fields.description) {
    next.description = fields.description;
  }
  if (selected.has("website") && fields.website) {
    next.website = fields.website;
  }
  if (selected.has("phone") && fields.phone) {
    next.phone = fields.phone;
  }

  const selectedContextFields = {
    opening_hours_note: selected.has("opening_hours_note") ? fields.opening_hours_note : null,
    work_notes: (fields.work_notes || []).filter((_, index) => selected.has(`work_notes.${index}`)),
    review_insights: fields.review_insights
      ? {
          summary: selected.has("review_insights.summary") ? fields.review_insights.summary : null,
          positives: null,
          cautions: null,
          remote_work_signal: selected.has("review_insights.remote_work_signal")
            ? fields.review_insights.remote_work_signal
            : null,
        }
      : null,
  };
  if (
    selectedContextFields.opening_hours_note ||
    selectedContextFields.work_notes.length > 0 ||
    selectedContextFields.review_insights?.summary ||
    selectedContextFields.review_insights?.remote_work_signal
  ) {
    next.description = mergePublicAiDescription(next.description, selectedContextFields);
    next.admin_notes = appendAiContextNotes(next.admin_notes, selectedContextFields);
  }

  const selectedWorkDetails = Object.fromEntries(
    Object.entries(fields.work_details || {}).filter(([key]) => selected.has(`work_details.${key}`)),
  ) as Record<string, string | number | boolean | null>;
  if (Object.keys(selectedWorkDetails).length > 0) {
    return applyAiWorkDetails(next, selectedWorkDetails);
  }

  return next;
}

function getBooleanField(fields: Record<string, string | number | boolean | null>, key: string, fallback: boolean) {
  return typeof fields[key] === "boolean" ? fields[key] : fallback;
}

function getNumberField(fields: Record<string, string | number | boolean | null>, key: string, fallback: number) {
  return typeof fields[key] === "number" && Number.isFinite(fields[key]) ? fields[key] : fallback;
}

function getStringField(fields: Record<string, string | number | boolean | null>, key: string, fallback: string) {
  return typeof fields[key] === "string" ? fields[key] : fallback;
}

function appendAdminNote(existing: string, note: string) {
  if (!existing.trim()) return note;
  if (existing.includes(note)) return existing;
  return `${existing.trim()}\n\n${note}`;
}

type AiContextFields = Pick<
  NonNullable<AiEnrichmentRow["suggested_fields"]>,
  "opening_hours_note" | "review_insights" | "work_notes"
>;

function appendAiContextNotes(existing: string, fields: Partial<AiContextFields>) {
  let notes = existing;
  if (fields.opening_hours_note) {
    notes = appendAdminNote(notes, `AI opening hours note: ${fields.opening_hours_note}`);
  }
  if (fields.review_insights?.summary) {
    notes = appendAdminNote(notes, `AI review insight: ${fields.review_insights.summary}`);
  }
  if (fields.review_insights?.remote_work_signal) {
    notes = appendAdminNote(notes, `AI remote-work signal: ${fields.review_insights.remote_work_signal}`);
  }
  return notes;
}

function mergePublicAiDescription(
  baseDescription: string,
  fields: Partial<AiContextFields>,
) {
  const reviewSummary = fields.review_insights?.summary?.trim();
  const remoteWorkSignal = fields.review_insights?.remote_work_signal?.trim();
  const workNotes = fields.work_notes?.map((note) => note.trim()).filter(Boolean).slice(0, 3) || [];
  const publicNotes = [
    reviewSummary ? `Public review patterns: ${reviewSummary}` : null,
    remoteWorkSignal ? `Remote work signal: ${remoteWorkSignal}` : null,
    ...workNotes.map((note) => `Work note: ${note}`),
  ].filter((note): note is string => Boolean(note));

  if (publicNotes.length === 0) return baseDescription;

  const existing = baseDescription.trim();
  const section = ["What to know before going", ...publicNotes.map((note) => `- ${note}`)].join("\n");
  if (existing.includes("What to know before going")) return existing;
  return [existing, section].filter(Boolean).join("\n\n");
}
