import { createClient } from "@/lib/supabase/client";
import { resolveAvatarUrl } from "@/lib/utils";
import type { ProfileSummary } from "@/lib/types";

export async function getProfile(userId: string): Promise<ProfileSummary | null> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, avatar_url, email, tag")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Error loading profile:", error);
    return null;
  }

  if (!data) return null;

  return {
    ...data,
    avatar_url: resolveAvatarUrl(data.avatar_url),
  };
}

export async function updateProfile(
  userId: string,
  updates: Partial<ProfileSummary>
) {
  const supabase = createClient();
  
  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId);

  if (error) throw error;
}
