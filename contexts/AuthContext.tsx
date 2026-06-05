"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { resolveAvatarUrl } from "@/lib/utils";
import type { ProfileSummary } from "@/lib/types";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profile: ProfileSummary | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const profileUserIdRef = useRef<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

  const loadProfile = useCallback(async (userId: string) => {
    if (profileUserIdRef.current === userId) return;

    const { data: profileData } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, avatar_url, email, tag, is_admin")
      .eq("id", userId)
      .maybeSingle();

    profileUserIdRef.current = userId;
    setProfile(profileData ? { ...profileData, avatar_url: resolveAvatarUrl(profileData.avatar_url) } : null);
  }, [supabase]);

  useEffect(() => {
    const getSessionAndProfile = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user?.id) {
        await loadProfile(session.user.id);
      } else {
        profileUserIdRef.current = null;
        setProfile(null);
      }

      setLoading(false);
    };

    getSessionAndProfile();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user?.id) {
        if (event !== "TOKEN_REFRESHED") {
          loadProfile(session.user.id);
        }
      } else {
        profileUserIdRef.current = null;
        setProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [loadProfile, supabase]);

  useEffect(() => {
    if (!user?.id) return;

    const handleProfileUpdate = () => {
      profileUserIdRef.current = null;
      loadProfile(user.id);
    };

    window.addEventListener("profileUpdated", handleProfileUpdate);
    return () => window.removeEventListener("profileUpdated", handleProfileUpdate);
  }, [loadProfile, user?.id]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, profile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
