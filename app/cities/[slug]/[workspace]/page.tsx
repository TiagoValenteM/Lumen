"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { resolveAvatarUrl } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";
import { useSavedWorkspace } from "@/hooks/useSavedWorkspace";
import { useVisitedWorkspace } from "@/hooks/useVisitedWorkspace";
import { submitWorkspaceSuggestion, type WorkspaceSuggestionKind } from "@/lib/features/workspace-suggestions/actions";
import type { City, WorkspaceDetail, Photo, Review, ProfileSummary } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import { ArrowLeft, Loader2 } from "lucide-react";
import { WorkspaceGallery } from "./_components/workspace-gallery";
import { WorkspaceHeader } from "./_components/workspace-header";
import { WorkspaceMainDetails } from "./_components/workspace-main-details";
import { WorkspaceReviewsSection } from "./_components/workspace-reviews-section";
import { WorkspaceSidebar } from "./_components/workspace-sidebar";

export default function WorkspacePage() {
  const params = useParams();
  const citySlug = params.slug as string;
  const workspaceSlug = params.workspace as string;
  const { user } = useAuth();
  
  const [city, setCity] = useState<City | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceDetail | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [profilesById, setProfilesById] = useState<Record<string, ProfileSummary>>({});
  const [loading, setLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [suggestionOpen, setSuggestionOpen] = useState(false);
  const [suggestionKind, setSuggestionKind] = useState<WorkspaceSuggestionKind>("wrong_location");
  const [suggestionMessage, setSuggestionMessage] = useState("");
  const [submittingSuggestion, setSubmittingSuggestion] = useState(false);
  const { toast, showSuccess, showError } = useToast();
  const { isSaved, toggleSave } = useSavedWorkspace(user?.id, workspace?.id || "");
  const { hasVisited, toggleVisited } = useVisitedWorkspace(user?.id, workspace?.id || "");
  const MAX_COMMENT_LENGTH = 500;
  const supabase = useMemo(() => createClient(), []);

  const loadReviews = useCallback(async (workspaceId: string) => {
    const { data: reviewsData, error: reviewsError } = await supabase
      .from("reviews")
      .select("id, user_id, rating, comment, created_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (reviewsError) {
      console.error("Error fetching reviews:", reviewsError);
      return;
    }

    if (reviewsData) {
      setReviews(reviewsData);

      // Fetch profile summaries for unique user_ids
      const userIds = Array.from(new Set(reviewsData.map((r) => r.user_id).filter(Boolean)));
      if (userIds.length > 0) {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, avatar_url, email, tag")
          .in("id", userIds);

        if (profileError) {
          console.error("Error fetching profiles:", profileError);
        } else if (profileData) {
          const map: Record<string, ProfileSummary> = {};
          profileData.forEach((p) => {
            map[p.id] = {
              ...(p as ProfileSummary),
              avatar_url: resolveAvatarUrl((p as ProfileSummary).avatar_url),
            };
          });
          setProfilesById(map);
        }
      }
    }
  }, [supabase]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      // Fetch city
      const { data: cityData } = await supabase
        .from('cities')
        .select('id, name, slug, country')
        .eq('slug', citySlug)
        .single();

      if (cityData) {
        setCity(cityData);

        // Fetch workspace
        const { data: workspaceData } = await supabase
          .from('workspaces')
          .select('*')
          .eq('slug', workspaceSlug)
          .eq('city_id', (await supabase.from('cities').select('id').eq('slug', citySlug).single()).data?.id)
          .eq('status', 'approved')
          .single();

        if (workspaceData) {
          setWorkspace(workspaceData);

          // Fetch photos
          const { data: photosData } = await supabase
            .from('workspace_photos')
            .select('id, url, caption, is_primary')
            .eq('workspace_id', workspaceData.id)
            .eq('is_approved', true)
            .order('is_primary', { ascending: false })
            .order('created_at', { ascending: true });

          if (photosData) {
            setPhotos(photosData);
          }

          await loadReviews(workspaceData.id);
        }
      }

      setLoading(false);
    }

    fetchData();
  }, [citySlug, workspaceSlug, supabase, loadReviews]);

  const handleSubmitReview = async (rating: number, comment: string) => {
    if (!user || !workspace) return false;
    if (rating === 0) {
      showError("Please select a rating");
      return false;
    }
    if (comment.trim().length > MAX_COMMENT_LENGTH) {
      showError(`Comment is too long. Please keep it under ${MAX_COMMENT_LENGTH} characters.`);
      return false;
    }

    setSubmittingReview(true);
    try {
      // Ensure profile exists to satisfy FK
      await supabase.from('profiles').upsert(
        {
          id: user.id,
          first_name: user.user_metadata?.first_name || null,
          last_name: user.user_metadata?.last_name || null,
          avatar_url: user.user_metadata?.avatar_url || null,
        },
        { onConflict: 'id' }
      );

      const { error } = await supabase
        .from('reviews')
        .upsert({
          workspace_id: workspace.id,
          user_id: user.id,
          rating,
          comment: comment.trim() || null,
        }, { onConflict: "workspace_id,user_id" });

      if (error) throw error;

      // Refresh reviews
      await loadReviews(workspace.id);
      setShowReviewForm(false);
      showSuccess("Review submitted successfully!");
      return true;
    } catch (error: unknown) {
      console.error('Error submitting review:', error);
      const errorMessage = (error as Error)?.message || 'Failed to submit review';
      showError(`Error: ${errorMessage}. Please make sure the reviews table migration has been run in Supabase.`, 4000);
      return false;
    } finally {
      setSubmittingReview(false);
    }
  };

  const submitSuggestion = async () => {
    if (!user || !workspace) {
      showError("Please sign in to suggest an edit");
      return;
    }
    if (suggestionMessage.trim().length < 10) {
      showError("Please add a little more detail.");
      return;
    }

    setSubmittingSuggestion(true);
    try {
      const result = await submitWorkspaceSuggestion(supabase, {
        workspaceId: workspace.id,
        userId: user.id,
        kind: suggestionKind,
        message: suggestionMessage.trim(),
      });

      const nextCount = result?.reported_change_count ?? Number(workspace.reported_change_count || 0) + 1;
      setWorkspace({ ...workspace, reported_change_count: nextCount });
      setSuggestionMessage("");
      setSuggestionKind("wrong_location");
      setSuggestionOpen(false);
      showSuccess("Thanks. Your suggestion was sent for review.");
    } catch (error) {
      console.error("Failed to submit edit suggestion", error);
      showError("Could not submit the suggestion. Please try again.");
    } finally {
      setSubmittingSuggestion(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-full bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (!workspace || !city) {
    return (
      <div className="min-h-full bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Workspace Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The workspace you&apos;re looking for doesn&apos;t exist.
          </p>
          <Button asChild>
            <Link href="/cities">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Cities
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <WorkspaceHeader city={city} workspace={workspace} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <WorkspaceGallery photos={photos} workspaceName={workspace.name} />
            <WorkspaceMainDetails workspace={workspace} />
          </div>

          <WorkspaceSidebar
            workspace={workspace}
            userSignedIn={Boolean(user)}
            hasVisited={hasVisited}
            isSaved={isSaved}
            suggestionOpen={suggestionOpen}
            suggestionKind={suggestionKind}
            suggestionMessage={suggestionMessage}
            submittingSuggestion={submittingSuggestion}
            onToggleVisited={async () => {
              if (!user) {
                showError("Please sign in to mark as visited");
                return;
              }
              try {
                await toggleVisited();
                showSuccess(hasVisited ? "Removed from visited" : "Marked as been here!");
              } catch {
                showError("Failed to update visited status");
              }
            }}
            onToggleSaved={async () => {
              if (!user) {
                showError("Please sign in to save workspaces");
                return;
              }
              try {
                await toggleSave();
                showSuccess(isSaved ? "Workspace removed from saved" : "Workspace saved!");
              } catch {
                showError("Failed to save workspace");
              }
            }}
            onWriteReview={() => {
              if (!user) {
                showError("Please sign in to write a review");
                return;
              }
              setShowReviewForm(!showReviewForm);
            }}
            onSuggestionOpenChange={setSuggestionOpen}
            onSuggestionKindChange={setSuggestionKind}
            onSuggestionMessageChange={setSuggestionMessage}
            onSubmitSuggestion={submitSuggestion}
          />
        </div>

        <WorkspaceReviewsSection
          workspaceName={workspace.name}
          reviews={reviews}
          profilesById={profilesById}
          showReviewForm={showReviewForm}
          userSignedIn={Boolean(user)}
          submittingReview={submittingReview}
          maxCommentLength={MAX_COMMENT_LENGTH}
          onSubmitReview={handleSubmitReview}
          onCancelReview={() => setShowReviewForm(false)}
          onWriteFirstReview={() => {
            if (!user) {
              showError("Please sign in to write a review");
              return;
            }
            setShowReviewForm(true);
          }}
        />
      </div>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}
