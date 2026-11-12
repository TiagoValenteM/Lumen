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
  isAdmin: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const profileUserIdRef = useRef<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

  const loadProfile = useCallback(async (userId: string) => {
    if (profileUserIdRef.current === userId) return;

    profileUserIdRef.current = userId;
    const [{ data: profileData }, { data: admin }] = await Promise.all([
      supabase.from("profiles").select("id, first_name, last_name, avatar_url, tag").eq("id", userId).maybeSingle(),
      supabase.rpc("is_admin"),
    ]);
    if (profileUserIdRef.current !== userId) return;
    setProfile(profileData ? { ...profileData, avatar_url: resolveAvatarUrl(profileData.avatar_url) } : null);
    setIsAdmin(admin === true);
  }, [supabase]);

  useEffect(() => {
    let profileTimer: number | undefined;
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
        setIsAdmin(false);
      }

      setLoading(false);
    };

    getSessionAndProfile();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      window.clearTimeout(profileTimer);
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user?.id) {
        if (event !== "TOKEN_REFRESHED") {
          profileTimer = window.setTimeout(() => void loadProfile(session.user.id), 0);
        }
      } else {
        profileUserIdRef.current = null;
        setProfile(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => {
      window.clearTimeout(profileTimer);
      subscription.unsubscribe();
    };
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
    <AuthContext.Provider value={{ user, session, loading, profile, isAdmin, signOut }}>
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
