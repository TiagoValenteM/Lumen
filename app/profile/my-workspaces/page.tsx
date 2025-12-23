"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Loader2, MapPin, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { UserWorkspaceSummary } from "@/lib/types/profile";
import { LEVELS, LEVEL_ICONS, MEDAL_ICON_URL, getLevel } from "@/lib/constants/profileLevels";
import { Progress } from "@/components/ui/progress";

export default function MyWorkspacesPage() {
  const { user } = useAuth();
  const supabase = createClient();

  const [items, setItems] = useState<UserWorkspaceSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const level = getLevel(items.length);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);
      setError(null);
      try {
        const { data, error: fetchError } = await supabase
          .from("workspaces")
          .select(
            `
            id,
            name,
            slug,
            status,
            city:cities(slug, name)
          `
          )
          .eq("submitted_by", user.id)
          .order("created_at", { ascending: false });

        if (fetchError) throw fetchError;

        const mapped =
          data?.map((w) => {
            const cityField = Array.isArray(w.city) ? w.city[0] ?? null : w.city;
            return {
              id: w.id,
              name: w.name,
              slug: w.slug,
              city_slug: cityField?.slug ?? null,
              city_name: cityField?.name ?? null,
              status: w.status ?? null,
            };
          }) || [];

        setItems(mapped);
      } catch (err) {
        console.error("Failed to load my workspaces", err);
        setError("Could not load your added places. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [supabase, user]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-12 space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold">Your added places</h1>
            <p className="text-muted-foreground text-sm">
              All workspaces you&apos;ve submitted. Status and quick links included.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/profile">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to profile
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-5">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <img src={MEDAL_ICON_URL} alt="Medal icon" className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle>Level & progress</CardTitle>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <Badge variant="secondary" className="inline-flex items-center gap-2">
                    <img
                      src={LEVEL_ICONS[level.levelNumber - 1] ?? MEDAL_ICON_URL}
                      alt={level.title}
                      className="h-4 w-4"
                    />
                    <span>Lv {level.levelNumber} · {level.title}</span>
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {level.isMax
                      ? "Top tier unlocked"
                      : `${items.length}/${level.nextThreshold} to level up`}
                  </span>
                </div>
                <Progress value={level.progress} className="h-2" />
                <div className="flex flex-wrap gap-2.5">
                  {LEVELS.map((lvl, idx) => (
                    <Badge
                      key={lvl.title}
                      variant="outline"
                      className="text-[11px] inline-flex items-center gap-2"
                    >
                      <img
                        src={LEVEL_ICONS[idx] ?? MEDAL_ICON_URL}
                        alt={lvl.title}
                        className="h-4 w-4"
                      />
                      <span>
                        Lv {idx + 1}: {lvl.title} ({lvl.min}{lvl.max === Infinity ? "+" : `-${lvl.max}`})
                      </span>
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Added places</CardTitle>
              <CardDescription>
                {items.length === 1 ? "1 place submitted by you" : `${items.length} places submitted by you`}
              </CardDescription>
            </div>
            <Button asChild size="sm" variant="secondary">
              <Link href="/add-workspace" className="inline-flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add a new place
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-5">
            {loading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading your places...</span>
              </div>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            {!loading && !error && items.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="py-8 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 text-primary inline-flex items-center justify-center">
                    <Plus className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium">No places added yet</p>
                    <p className="text-sm text-muted-foreground">
                      Share your favorite work-friendly spots and track their status here.
                    </p>
                  </div>
                  <Button asChild>
                    <Link href="/add-workspace">Add your first place</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {items.map((ws) => {
                const citySlug = ws.city_slug || "global";
                const cityName = ws.city_name || "Global";
                return (
                  <Card key={ws.id} className="border-muted hover:border-primary/70 transition-colors shadow-sm">
                    <CardContent className="pt-5 pb-5 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                              <MapPin className="h-4 w-4" />
                            </span>
                            <div>
                              <h3 className="font-semibold leading-tight">{ws.name}</h3>
                              <p className="text-xs text-muted-foreground">{cityName}</p>
                            </div>
                          </div>
                        </div>
                        {ws.status && (
                          <Badge variant="outline" className="text-[11px] capitalize">
                            {ws.status}
                          </Badge>
                        )}
                      </div>
                      <Link
                        href={`/cities/${citySlug}/${ws.slug}`}
                        className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-1"
                      >
                        View details
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
