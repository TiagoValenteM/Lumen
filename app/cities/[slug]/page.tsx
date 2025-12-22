"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WorkspaceCard } from "@/components/features/workspace";
import type { City, Workspace } from "@/lib/types";
import { FILTER_GROUPS, FILTER_ICONS, SUPPORTED_FILTERS, MAX_ACTIVE_FILTERS } from "@/lib/constants/filters";
import {
  ArrowLeft,
  MapPin,
  Loader2,
  Building2,
  SlidersHorizontal,
} from "lucide-react";

export default function CityPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [city, setCity] = useState<City | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedFilters, setSelectedFilters] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const toggleFilter = (option: string) => {
    setSelectedFilters((prev) => {
      const next = new Set(prev);
      if (next.has(option)) {
        next.delete(option);
      } else {
        if (next.size >= MAX_ACTIVE_FILTERS) return prev;
        next.add(option);
      }
      return next;
    });
  };

  const activeFilters = Array.from(selectedFilters);

  const filteredWorkspaces = useMemo(() => {
    if (!activeFilters.length) return workspaces;
    return workspaces.filter((workspace) => {
      return activeFilters.every((filter) => {
        const key = SUPPORTED_FILTERS[filter];
        if (!key) return true; // filters we don't have data for are ignored
        const value = workspace[key];
        return value === true;
      });
    });
  }, [activeFilters, workspaces]);

  useEffect(() => {
    async function fetchCityAndWorkspaces() {
      setLoading(true);

      // Fetch city info
      const { data: cityData, error: cityError } = await supabase
        .from('cities')
        .select('id, name, slug, country, workspace_count, description')
        .eq('slug', slug)
        .single();

      if (cityData && !cityError) {
        setCity(cityData);

        // Fetch workspaces for this city
        const { data: workspacesData, error: workspacesError } = await supabase
          .from('workspaces')
          .select(`
            id,
            name,
            slug,
            type,
            short_description,
            address,
            has_wifi,
            has_power_outlets,
            has_coffee,
            overall_rating,
            total_reviews
          `)
          .eq('city_id', cityData.id)
          .eq('status', 'approved')
          .order('overall_rating', { ascending: false });

        if (workspacesData && !workspacesError) {
          // Fetch primary photos for each workspace
          const workspacesWithPhotos = await Promise.all(
            workspacesData.map(async (workspace) => {
              const { data: photoData } = await supabase
                .from('workspace_photos')
                .select('url')
                .eq('workspace_id', workspace.id)
                .eq('is_primary', true)
                .eq('is_approved', true)
                .single();

              return {
                ...workspace,
                primary_photo: photoData,
              };
            })
          );

          setWorkspaces(workspacesWithPhotos);
        }
      }

      setLoading(false);
    }

    fetchCityAndWorkspaces();
  }, [slug, supabase]);

  if (loading) {
    return (
      <div className="min-h-full bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Loading city...</p>
        </div>
      </div>
    );
  }

  if (!city) {
    return (
      <div className="min-h-full bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">City Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The city you&apos;re looking for doesn&apos;t exist.
          </p>
          <Button asChild>
            <Link href="/cities">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Cities
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Button variant="ghost" asChild className="mb-6">
          <Link href="/cities">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Cities
          </Link>
        </Button>

        <div className="mb-8">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <MapPin className="h-4 w-4" />
            <span>{city.country}</span>
          </div>
          <h1 className="text-5xl font-bold mb-4">{city.name}</h1>
          {city.description ? (
            <p className="text-xl text-muted-foreground">{city.description}</p>
          ) : (
            <p className="text-xl text-muted-foreground">
              Discover productive workspaces and digital nomad-friendly spots
            </p>
          )}
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold flex items-center gap-3">
              <Building2 className="h-8 w-8" />
              Workspaces
            </h2>
            <div className="text-muted-foreground">
              {filteredWorkspaces.length} {filteredWorkspaces.length === 1 ? 'space' : 'spaces'} found
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card/60 p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <SlidersHorizontal className="h-4 w-4" />
                Filters
              </div>
              {activeFilters.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setSelectedFilters(new Set())}>
                  Clear
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {FILTER_GROUPS.map((group) => (
                <div key={group.label} className="space-y-2">
                  <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
                    {group.label}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {group.options.map((option) => {
                      const isActive = selectedFilters.has(option);
                      const Icon = FILTER_ICONS[option];
                      return (
                        <Button
                          key={option}
                          size="sm"
                          variant={isActive ? "default" : "outline"}
                          className="text-xs"
                          onClick={() => toggleFilter(option)}
                        >
                          {Icon && <Icon className="h-3.5 w-3.5 mr-1.5" />}
                          {option}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {activeFilters.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {activeFilters.map((f) => (
                  <Badge
                    key={f}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => toggleFilter(f)}
                  >
                    {f} ×
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {filteredWorkspaces.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredWorkspaces.map((workspace) => (
                <WorkspaceCard
                  key={workspace.id}
                  workspace={workspace}
                  citySlug={city.slug}
                />
              ))}
            </div>
          ) : (
            <div className="bg-card border border-border rounded-lg p-12 text-center">
              <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No workspaces yet</h3>
              <p className="text-muted-foreground mb-6">
                Be the first to add a workspace in {city.name}!
              </p>
              <Button asChild>
                <Link href="/suggest">Add Workspace</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
