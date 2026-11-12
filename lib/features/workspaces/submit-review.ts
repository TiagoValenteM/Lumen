import type { SupabaseClient } from "@supabase/supabase-js";

export async function submitWorkspaceReview(
  supabase: SupabaseClient,
  { workspaceId, userId, rating, comment }: {
    workspaceId: string;
    userId: string;
    rating: number;
    comment: string;
  },
) {
  const { error } = await supabase.from("reviews").upsert({
    workspace_id: workspaceId,
    user_id: userId,
    rating,
    comment: comment.trim() || null,
  }, { onConflict: "workspace_id,user_id" });
  if (error) throw error;
}
