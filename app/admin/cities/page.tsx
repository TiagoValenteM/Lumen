"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Building2, Loader2, Merge, Shield, Star, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { deleteCityIfEmpty, mergeCityBySlug } from "@/lib/features/admin-cities/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type CityRow = {
  id: string;
  name: string;
  slug: string;
  country: string | null;
  workspace_count: number | null;
  featured: boolean | null;
  workspaces?: { id: string; status: string | null }[] | null;
};

export default function AdminCitiesPage() {
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cities, setCities] = useState<CityRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [mergeTargets, setMergeTargets] = useState<Record<string, string>>({});

  const loadProfile = useCallback(async () => {
    if (!user) {
      setLoadingProfile(false);
      return;
    }
    setLoadingProfile(true);
    const { data, error: profileError } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) {
      console.error("Failed to load profile", profileError);
    } else {
      setIsAdmin(Boolean(data?.is_admin));
    }
    setLoadingProfile(false);
  }, [supabase, user]);

  const loadCities = useCallback(async () => {
    if (!user || !isAdmin) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from("cities")
        .select("id, name, slug, country, workspace_count, featured, workspaces(id, status)")
        .order("name", { ascending: true });
      if (fetchError) throw fetchError;
      setCities((data as CityRow[] | null) || []);
    } catch (err) {
      console.error("Failed to load cities", err);
      setError("Could not load cities.");
    } finally {
      setLoading(false);
    }
  }, [supabase, user, isAdmin]);

  useEffect(() => {
    // Admin profile is loaded from Supabase when the authenticated user changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (isAdmin) {
      // City rows are loaded from Supabase after admin access is confirmed.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadCities();
    }
  }, [isAdmin, loadCities]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return cities.filter((city) => {
      if (!query) return true;
      return city.name.toLowerCase().includes(query) || city.slug.toLowerCase().includes(query);
    });
  }, [cities, search]);

  const cityCounts = (city: CityRow) => {
    const workspaces = city.workspaces || [];
    return {
      total: workspaces.length,
      approved: workspaces.filter((workspace) => workspace.status === "approved").length,
      pending: workspaces.filter((workspace) => workspace.status === "pending" || workspace.status === "under_review").length,
    };
  };

  const deleteEmptyCity = async (cityId: string) => {
    setSavingId(cityId);
    setError(null);
    try {
      const deleted = await deleteCityIfEmpty(supabase, cityId);
      if (!deleted) {
        setError("City was not deleted because it is featured or still has places.");
        return;
      }
      setCities((prev) => prev.filter((city) => city.id !== cityId));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not delete city.";
      console.error("Failed to delete city", message);
      setError(message);
    } finally {
      setSavingId(null);
    }
  };

  const toggleFeatured = async (city: CityRow) => {
    setSavingId(city.id);
    try {
      const { error: updateError } = await supabase.from("cities").update({ featured: !city.featured }).eq("id", city.id);
      if (updateError) throw updateError;
      setCities((prev) => prev.map((item) => (item.id === city.id ? { ...item, featured: !city.featured } : item)));
    } catch (err) {
      console.error("Failed to update city", err);
      setError("Could not update city.");
    } finally {
      setSavingId(null);
    }
  };

  const mergeCity = async (city: CityRow) => {
    const targetSlug = mergeTargets[city.id]?.trim();
    if (!targetSlug || targetSlug === city.slug) return;
    setSavingId(city.id);
    setError(null);
    try {
      await mergeCityBySlug(supabase, city.id, targetSlug);
      await loadCities();
    } catch (err) {
      console.error("Failed to merge city", err);
      setError(err instanceof Error ? err.message : "Could not merge city.");
    } finally {
      setSavingId(null);
    }
  };

  if (loadingProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
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
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to profile
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-10">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Admin · Cities</h1>
            <p className="text-sm text-muted-foreground">Review city health, merge duplicates, and remove empty cities.</p>
          </div>
          <div className="flex gap-2">
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search cities" />
            <Button asChild variant="outline">
              <Link href="/admin/workspaces">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Workspaces
              </Link>
            </Button>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Card>
          <CardHeader>
            <CardTitle>Cities</CardTitle>
            <CardDescription>{filtered.length} cities shown</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading cities...
              </div>
            )}
            {filtered.map((city) => {
              const counts = cityCounts(city);
              return (
                <div key={city.id} className="rounded-md border p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <h2 className="font-semibold">{city.name}</h2>
                        <span className="text-sm text-muted-foreground">{city.country}</span>
                        {city.featured && (
                          <Badge variant="secondary">
                            <Star className="mr-1 h-3 w-3" />
                            Featured
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline">{counts.total} total</Badge>
                        <Badge variant="outline">{counts.approved} approved</Badge>
                        <Badge variant="outline">{counts.pending} pending/fix</Badge>
                        <Badge variant="outline">slug: {city.slug}</Badge>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 md:flex-row">
                      <Input
                        value={mergeTargets[city.id] || ""}
                        onChange={(event) => setMergeTargets((prev) => ({ ...prev, [city.id]: event.target.value }))}
                        placeholder="Merge into city slug"
                        className="md:w-48"
                      />
                      <Button variant="outline" disabled={savingId === city.id} onClick={() => mergeCity(city)}>
                        <Merge className="mr-2 h-4 w-4" />
                        Merge
                      </Button>
                      <Button variant="outline" disabled={savingId === city.id} onClick={() => toggleFeatured(city)}>
                        <Star className="mr-2 h-4 w-4" />
                        {city.featured ? "Unfeature" : "Feature"}
                      </Button>
                      <Button variant="outline" disabled={savingId === city.id || counts.total > 0} onClick={() => deleteEmptyCity(city.id)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete empty
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
