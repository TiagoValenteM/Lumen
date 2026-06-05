"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Clock, Loader2, MapPin, Plus, Wrench, XCircle, type LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { UserWorkspaceSummary } from "@/lib/types/profile";
import { LEVELS, LEVEL_ICONS, MEDAL_ICON_URL, getLevel } from "@/lib/constants/profileLevels";
import { Progress } from "@/components/ui/progress";

type MyWorkspaceRow = {
  id: string;
  name: string;
  slug: string;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
  rejection_reason?: string | null;
  short_description: string | null;
  latitude: number | null;
  longitude: number | null;
  city: { slug: string | null; name: string | null } | { slug: string | null; name: string | null }[] | null;
};

export default function MyWorkspacesPage() {
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  const [items, setItems] = useState<UserWorkspaceSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const level = getLevel(items.length);

  const statusCounts = useMemo(
    () =>
      items.reduce(
        (acc, item) => {
          const status = item.status || "pending";
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
    [items],
  );

  const statusMeta = (status: string | null) => {
    switch (status) {
      case "approved":
        return {
          label: "Live",
          description: "Approved and visible in Lumen.",
          icon: CheckCircle2,
          className: "border-green-200 bg-green-50 text-green-700",
        };
      case "rejected":
        return {
          label: "Rejected",
          description: "Not published. Review the reason and submit a corrected place.",
          icon: XCircle,
          className: "border-red-200 bg-red-50 text-red-700",
        };
      case "under_review":
        return {
          label: "Needs fixes",
          description: "An admin requested changes before approval.",
          icon: Wrench,
          className: "border-blue-200 bg-blue-50 text-blue-700",
        };
      default:
        return {
          label: "Pending",
          description: "Queued for admin review.",
          icon: Clock,
          className: "border-yellow-200 bg-yellow-50 text-yellow-700",
        };
    }
  };

  const statusSummary: Array<[string, number, LucideIcon]> = [
    ["Pending", statusCounts.pending || 0, Clock],
    ["Needs fixes", statusCounts.under_review || 0, Wrench],
    ["Live", statusCounts.approved || 0, CheckCircle2],
    ["Rejected", statusCounts.rejected || 0, XCircle],
  ];

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);
      setError(null);
      try {
        let includeModerationReason = true;
        const result = await supabase
          .from("workspaces")
          .select(
            `
            id,
            name,
            slug,
            status,
            created_at,
            updated_at,
            rejection_reason,
            short_description,
            latitude,
            longitude,
            city:cities(slug, name)
          `
          )
          .eq("submitted_by", user.id)
          .order("created_at", { ascending: false });
        let data = result.data as MyWorkspaceRow[] | null;
        let fetchError = result.error;

        if (fetchError && isMissingModerationColumnError(fetchError)) {
          includeModerationReason = false;
          const fallback = await supabase
            .from("workspaces")
            .select(
              `
              id,
              name,
              slug,
              status,
              created_at,
              updated_at,
              short_description,
              latitude,
              longitude,
              city:cities(slug, name)
            `
            )
            .eq("submitted_by", user.id)
            .order("created_at", { ascending: false });

          data = fallback.data as MyWorkspaceRow[] | null;
          fetchError = fallback.error;
        }

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
              created_at: w.created_at ?? null,
              updated_at: w.updated_at ?? null,
              rejection_reason: includeModerationReason ? w.rejection_reason ?? null : null,
              short_description: w.short_description ?? null,
              latitude: w.latitude ?? null,
              longitude: w.longitude ?? null,
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
                  <Image src={MEDAL_ICON_URL} alt="Medal icon" width={24} height={24} className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle>Level & progress</CardTitle>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <Badge variant="secondary" className="inline-flex items-center gap-2">
                    <Image
                      src={LEVEL_ICONS[level.levelNumber - 1] ?? MEDAL_ICON_URL}
                      alt={level.title}
                      width={16}
                      height={16}
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
                      <Image
                        src={LEVEL_ICONS[idx] ?? MEDAL_ICON_URL}
                        alt={lvl.title}
                        width={16}
                        height={16}
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

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {statusSummary.map(([label, count, Icon]) => (
            <Card key={String(label)}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-xs text-muted-foreground">{String(label)}</p>
                  <p className="text-2xl font-semibold">{Number(count)}</p>
                </div>
                <Icon className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
        </div>

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
                const meta = statusMeta(ws.status);
                const StatusIcon = meta.icon;
                const canViewPublic = ws.status === "approved";
                return (
                  <Card key={ws.id} className="border-border/35 shadow-sm shadow-black/5 transition-colors hover:border-primary/30 dark:shadow-black/20">
                    <CardContent className="pt-5 pb-5 space-y-4">
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
                        <Badge variant="outline" className={`text-[11px] ${meta.className}`}>
                          <StatusIcon className="mr-1 h-3 w-3" />
                          {meta.label}
                        </Badge>
                      </div>
                      {ws.short_description && <p className="text-sm text-muted-foreground line-clamp-2">{ws.short_description}</p>}
                      <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <div className="space-y-1">
                            <p className="font-medium text-foreground">{meta.description}</p>
                            {ws.rejection_reason && <p>{ws.rejection_reason}</p>}
                            {ws.latitude === null || ws.longitude === null ? <p>Location pin is missing.</p> : null}
                          </div>
                        </div>
                      </div>
                      {canViewPublic ? (
                        <Link
                          href={`/cities/${citySlug}/${ws.slug}`}
                          className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-1"
                        >
                          View live page
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground">Public page appears after approval.</span>
                      )}
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

function isMissingModerationColumnError(error: { code?: string; message?: string }) {
  const message = error.message?.toLowerCase() ?? "";
  return error.code === "42703" || error.code === "PGRST204" || message.includes("rejection_reason");
}
