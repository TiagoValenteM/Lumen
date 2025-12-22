import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { resolveAvatarUrl } from "@/lib/utils";
import type { ProfileSummary } from "@/lib/types";

export function useProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  const fetchProfile = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, avatar_url, email, tag")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error loading profile:", error);
      setLoading(false);
      return;
    }

    if (data) {
      setProfile({
        ...data,
        avatar_url: resolveAvatarUrl(data.avatar_url),
      });
    }
    setLoading(false);
  }, [userId, supabase]);

  useEffect(() => {
    fetchProfile();

    // Listen for profile updates
    const handleProfileUpdate = () => {
      fetchProfile();
    };

    window.addEventListener("profileUpdated", handleProfileUpdate);

    return () => {
      window.removeEventListener("profileUpdated", handleProfileUpdate);
    };
  }, [fetchProfile]);

  const refetch = useCallback(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    loading,
    refetch,
  };
}
