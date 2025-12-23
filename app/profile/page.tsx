"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, Bookmark, MapPinCheck, ArrowRight, Settings, Mail, AtSign, Calendar, MapPin, Navigation } from "lucide-react";
import Link from "next/link";
import { getInitials, getDisplayName } from "@/lib/utils";
import type { Profile } from "@/lib/types";
import { useLocation } from "@/contexts/LocationContext";
import { useCallback } from "react";

type NearbyWorkspace = {
  id: string;
  name: string;
  slug: string;
  city_slug: string | null;
  city_name: string | null;
  latitude: number | null;
  longitude: number | null;
  distanceKm: number;
};

export default function ProfilePage() {
  const { user } = useAuth();
  const supabase = createClient();
  const { latitude, longitude, loading: geoLoading, error: geoError, requestLocation } = useLocation();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [savedCount, setSavedCount] = useState(0);
  const [visitedCount, setVisitedCount] = useState(0);
  const [visitedIds, setVisitedIds] = useState<Set<string>>(new Set());
  const [nearby, setNearby] = useState<NearbyWorkspace[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyError, setNearbyError] = useState<string | null>(null);
  const [placeLabel, setPlaceLabel] = useState<string | null>(null);

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
        const { data: visitedRows, count: visitedWorkspacesCount } = await supabase
          .from("visited_workspaces")
          .select("workspace_id", { count: "exact", head: false })
          .eq("user_id", user!.id);
        
        setVisitedCount(visitedWorkspacesCount || 0);
        setVisitedIds(new Set(visitedRows?.map((r) => r.workspace_id) || []));
      }
      setLoading(false);
    }
    loadProfile();
  }, [user, supabase]);

  useEffect(() => {
    const loadNearby = async () => {
      if (!user || latitude === null || longitude === null) return;
      setNearbyLoading(true);
      setNearbyError(null);
      try {
        // Rough bounding box to prefilter server-side (~10km radius)
        const latRadiusDeg = 10 / 111; // ~111km per degree latitude
        const lonRadiusDeg = 10 / (111 * Math.cos((latitude * Math.PI) / 180) || 1);

        const { data, error } = await supabase
          .from("workspaces")
          .select(
            `
            id,
            name,
            slug,
            latitude,
            longitude,
            status,
            city:cities(slug, name)
          `
          )
          .eq("status", "approved")
          .not("latitude", "is", null)
          .not("longitude", "is", null)
          .gte("latitude", latitude - latRadiusDeg)
          .lte("latitude", latitude + latRadiusDeg)
          .gte("longitude", longitude - lonRadiusDeg)
          .lte("longitude", longitude + lonRadiusDeg)
          .limit(100);

        if (error) throw error;

        const deg2rad = (deg: number) => deg * (Math.PI / 180);
        const R = 6371; // km
        const haversine = (lat2: number, lon2: number) => {
          const dLat = deg2rad(lat2 - latitude);
          const dLon = deg2rad(lon2 - longitude);
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(latitude)) *
              Math.cos(deg2rad(lat2)) *
              Math.sin(dLon / 2) *
              Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          return R * c;
        };

        const filtered =
          data
            ?.filter((w) => w.latitude !== null && w.longitude !== null && !visitedIds.has(w.id))
            .map((w) => ({
              id: w.id,
              name: w.name,
              slug: w.slug,
              city_slug: (w as any).city?.slug ?? null,
              city_name: (w as any).city?.name ?? null,
              latitude: w.latitude,
              longitude: w.longitude,
              distanceKm: haversine(w.latitude as number, w.longitude as number),
            }))
            .filter((w) => w.distanceKm <= 10)
            .sort((a, b) => a.distanceKm - b.distanceKm)
            .slice(0, 5) || [];

        setNearby(filtered);
      } catch (err: any) {
        console.error("Failed to load nearby workspaces", err);
        setNearbyError("Could not load nearby workspaces. Please try again.");
      } finally {
        setNearbyLoading(false);
      }
    };

    loadNearby();
  }, [user, latitude, longitude, supabase, visitedIds]);

  const reverseGeocode = useCallback(async () => {
    if (latitude === null || longitude === null) return;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=12&addressdetails=1`,
        {
          headers: {
            "Accept": "application/json",
          },
        }
      );
      if (!res.ok) return;
      const json = await res.json();
      const label =
        json?.display_name ||
        [json?.address?.city, json?.address?.state, json?.address?.country]
          .filter(Boolean)
          .join(", ");
      if (label) setPlaceLabel(label);
    } catch (err) {
      // best-effort; ignore errors
      console.error("Reverse geocode failed", err);
    }
  }, [latitude, longitude]);

  useEffect(() => {
    reverseGeocode();
  }, [reverseGeocode]);

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

        {/* Nearby suggestions */}
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b">
            <div className="space-y-1">
              <CardTitle>Nearby recommendations</CardTitle>
              {latitude !== null && longitude !== null && placeLabel && (
                <p className="text-xs text-muted-foreground line-clamp-1">
                  Near: {placeLabel}
                </p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={requestLocation}
              disabled={geoLoading}
              className="inline-flex items-center gap-2 transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-md"
            >
              {geoLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Navigation className="h-4 w-4" />
              )}
              Use my location
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {geoError && (
              <div className="text-sm text-destructive">{geoError}</div>
            )}
            {!geoError && latitude === null && longitude === null && (
              <p className="text-sm text-muted-foreground">
                Share your location to see the closest work-friendly spots within 10 km.
              </p>
            )}
            {(geoLoading || nearbyLoading) && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Finding places near you...</span>
              </div>
            )}
            {nearbyError && (
              <div className="text-sm text-destructive">{nearbyError}</div>
            )}
            {!nearbyLoading && nearby.length === 0 && latitude !== null && longitude !== null && !nearbyError && (
              <p className="text-sm text-muted-foreground">
                Oops, we couldn’t find any new spots within 10 km. Try exploring cities to discover more places.
              </p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {nearby.map((ws) => (
                <Card
                  key={ws.id}
                  className="border-muted hover:border-primary/70 transition-colors shadow-sm"
                >
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <MapPin className="h-4 w-4" />
                          </span>
                          <div className="flex flex-col">
                            <Link
                              href={`/cities/${ws.city_slug ?? ""}/${ws.slug}`}
                              className="font-medium hover:underline"
                            >
                              {ws.name}
                            </Link>
                            <p className="text-xs text-muted-foreground">
                              {ws.city_name ?? "Unknown city"}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {ws.distanceKm.toFixed(1)} km
                        </Badge>
                        <Link
                          href={`/cities/${ws.city_slug ?? ""}/${ws.slug}`}
                          className="text-xs text-primary hover:underline font-medium"
                        >
                          View details
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
