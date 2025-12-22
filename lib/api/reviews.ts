import { createClient } from "@/lib/supabase/client";
import { resolveAvatarUrl } from "@/lib/utils";
import type { Review, ProfileSummary } from "@/lib/types";

export async function getReviews(workspaceId: string): Promise<{
  reviews: Review[];
  profilesById: Record<string, ProfileSummary>;
}> {
  const supabase = createClient();
  
  const { data: reviewsData, error: reviewsError } = await supabase
    .from("reviews")
    .select("id, user_id, rating, comment, created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (reviewsError) {
    console.error("Error fetching reviews:", reviewsError);
    return { reviews: [], profilesById: {} };
  }

  const reviews = reviewsData || [];
  const profilesById: Record<string, ProfileSummary> = {};

  if (reviews.length > 0) {
    const userIds = [...new Set(reviews.map((r) => r.user_id))];
    const { data: profileData } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, avatar_url, email, tag")
      .in("id", userIds);

    if (profileData) {
      profileData.forEach((p) => {
        profilesById[p.id] = {
          ...(p as ProfileSummary),
          avatar_url: resolveAvatarUrl((p as ProfileSummary).avatar_url),
        };
      });
    }
  }

  return { reviews, profilesById };
}

export async function createReview(
  workspaceId: string,
  userId: string,
  rating: number,
  comment: string | null
) {
  const supabase = createClient();

  // Ensure profile exists
  await supabase.from('profiles').upsert(
    { id: userId },
    { onConflict: 'id' }
  );

  const { error } = await supabase
    .from('reviews')
    .insert({
      workspace_id: workspaceId,
      user_id: userId,
      rating,
      comment: comment?.trim() || null,
    });

  if (error) throw error;
}
