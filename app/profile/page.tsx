"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, Bookmark, MapPinCheck, ArrowRight, Settings, Mail, AtSign, Calendar } from "lucide-react";
import Link from "next/link";
import { getInitials, getDisplayName } from "@/lib/utils";
import type { Profile } from "@/lib/types";

export default function ProfilePage() {
  const { user } = useAuth();
  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [savedCount, setSavedCount] = useState(0);
  const [visitedCount, setVisitedCount] = useState(0);

  const displayName = useMemo(() => {
    return getDisplayName(
      profile?.first_name,
      profile?.last_name,
      profile?.tag,
      profile?.email
    );
  }, [profile]);

  const initials = useMemo(() => {
    return getInitials(displayName);
  }, [displayName]);

  useEffect(() => {
    if (!user) return;
    async function loadProfile() {
      setLoading(true);
      
      // Load profile data
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email, tag, avatar_url, bio, created_at")
        .eq("id", user?.id)
        .maybeSingle();

      if (error) {
        console.error("Failed to fetch profile", error);
      } else if (data) {
        setProfile(data as Profile);
        
        // Load saved workspaces count
        const { count: savedWorkspacesCount } = await supabase
          .from("saved_workspaces")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user!.id);
        
        setSavedCount(savedWorkspacesCount || 0);
        
        // Load visited workspaces count
        const { count: visitedWorkspacesCount } = await supabase
          .from("visited_workspaces")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user!.id);
        
        setVisitedCount(visitedWorkspacesCount || 0);
      }
      setLoading(false);
    }
    loadProfile();
  }, [user, supabase]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Please sign in to view your profile.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading profile...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* User Header */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                <AvatarImage src={profile?.avatar_url || undefined} alt={displayName} />
                <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
              </Avatar>
              
              <div className="flex-1 space-y-3">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <h1 className="text-3xl font-bold">{displayName}</h1>
                    {profile?.tag && (
                      <div className="flex items-center gap-2 mt-1">
                        <AtSign className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">{profile.tag}</span>
                      </div>
                    )}
                  </div>
                  <Button asChild>
                    <Link href="/profile/edit">
                      <Settings className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Link>
                  </Button>
                </div>
                
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  {profile?.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <span>{profile.email}</span>
                    </div>
                  )}
                  {profile?.created_at && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>Joined {new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
                    </div>
                  )}
                </div>
                
                {profile?.bio && (
                  <p className="text-muted-foreground leading-relaxed">{profile.bio}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Link href="/saved">
            <Card className="hover:border-primary transition-colors cursor-pointer h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Bookmark className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Saved Workspaces</CardTitle>
                      <CardDescription>Your favorite places</CardDescription>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{savedCount}</div>
                <p className="text-sm text-muted-foreground mt-1">
                  {savedCount === 1 ? "workspace saved" : "workspaces saved"}
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/visited">
            <Card className="hover:border-primary transition-colors cursor-pointer h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <MapPinCheck className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Visited Workspaces</CardTitle>
                      <CardDescription>Places you&apos;ve been to</CardDescription>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{visitedCount}</div>
                <p className="text-sm text-muted-foreground mt-1">
                  {visitedCount === 1 ? "workspace visited" : "workspaces visited"}
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
