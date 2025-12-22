"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
  Map as MapIcon,
} from "lucide-react";

type MapInstance = import("maplibre-gl").Map & {
  _markers?: import("maplibre-gl").Marker[];
};

export default function CityPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { user } = useAuth();
  const [city, setCity] = useState<City | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedFilters, setSelectedFilters] = useState<Set<string>>(new Set());
  const [savedWorkspaceIds, setSavedWorkspaceIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<MapInstance | null>(null);
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

    const hasSavedFilter = activeFilters.includes("Saved");
    const hasQuiet = activeFilters.includes("Quiet");
    const hasLongStays = activeFilters.includes("Long stays");
    const otherFilters = activeFilters.filter(
      (f) => f !== "Saved" && f !== "Quiet" && f !== "Long stays"
    );

    return workspaces.filter((workspace) => {
      // Saved filter
      if (hasSavedFilter && !savedWorkspaceIds.has(workspace.id)) {
        return false;
      }

      // Quiet: noise level quiet or music volume <=2
      if (hasQuiet) {
        const noiseOk = workspace.noise_level === "quiet";
        const musicOk =
          typeof workspace.music_volume === "number"
            ? workspace.music_volume <= 2
            : workspace.music_volume === null;
        if (!noiseOk && !musicOk) return false;
      }

      // Long stays: time_limit_hours is 0 or null
      if (hasLongStays) {
        const tl = workspace.time_limit_hours;
        if (!(tl === null || tl === 0)) return false;
      }

      // Other supported filters
      return otherFilters.every((filter) => {
        const key = SUPPORTED_FILTERS[filter];
        if (!key) return true; // filters we don't have data for are ignored
        const value = workspace[key];
        return value === true;
      });
    });
  }, [activeFilters, workspaces, savedWorkspaceIds]);

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
            latitude,
            longitude,
            has_wifi,
            has_power_outlets,
            has_coffee,
            has_food,
            has_veg,
            has_alcohol,
            has_outdoor_seating,
            has_restrooms,
            has_bike_parking,
            has_parking,
            has_natural_light,
            is_accessible,
            allows_pets,
            good_for_groups,
            noise_level,
            music_volume,
            time_limit_hours,
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
                has_wifi: Boolean(workspace.has_wifi),
                has_power_outlets: Boolean(workspace.has_power_outlets),
                has_coffee: Boolean(workspace.has_coffee),
                has_food: Boolean(workspace.has_food),
                has_veg: Boolean(workspace.has_veg),
                has_alcohol: Boolean(workspace.has_alcohol),
                has_outdoor_seating: Boolean(workspace.has_outdoor_seating),
                has_restrooms: Boolean(workspace.has_restrooms),
                has_bike_parking: Boolean(workspace.has_bike_parking),
                has_parking: Boolean(workspace.has_parking),
                has_natural_light: Boolean(workspace.has_natural_light),
                is_accessible: Boolean(workspace.is_accessible),
                allows_pets: Boolean(workspace.allows_pets),
                good_for_groups: Boolean(workspace.good_for_groups),
                noise_level: workspace.noise_level,
                music_volume:
                  typeof workspace.music_volume === "number"
                    ? workspace.music_volume
                    : workspace.music_volume === null
                      ? null
                      : undefined,
                time_limit_hours:
                  typeof workspace.time_limit_hours === "number"
                    ? workspace.time_limit_hours
                    : workspace.time_limit_hours === null
                      ? null
                      : undefined,
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

  // Load saved workspaces for Saved filter
  useEffect(() => {
    async function loadSavedWorkspaces() {
      if (!user) {
        setSavedWorkspaceIds(new Set());
        return;
      }

      const { data, error } = await supabase
        .from("saved_workspaces")
        .select("workspace_id")
        .eq("user_id", user.id);

      if (!error && data) {
        setSavedWorkspaceIds(new Set(data.map((item) => item.workspace_id)));
      }
    }

    loadSavedWorkspaces();
  }, [supabase, user]);

  // Map integration using MapLibre (free, no key) + OSM raster tiles
  useEffect(() => {
    if (!city) return;

    const workspaceWithCoords = workspaces.filter(
      (w) => typeof w.latitude === "number" && typeof w.longitude === "number"
    );
    if (!workspaceWithCoords.length) return;

    let isMounted = true;

    async function loadMapLibre(): Promise<typeof import("maplibre-gl") | null> {
      if (typeof window === "undefined") return null;
      // Load CSS if not present
      if (!document.querySelector('link[data-maplibre="css"]')) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css";
        link.dataset.maplibre = "css";
        document.head.appendChild(link);
      }

      // Attribution/readability styling (matches app palette)
      if (!document.querySelector('style[data-maplibre="theme"]')) {
        const style = document.createElement("style");
        style.dataset.maplibre = "theme";
        style.innerHTML = `
          /* Force light palette inside map for readability */
          .maplibregl-map {
            color-scheme: light;
            --background: hsl(0 0% 100%);
            --foreground: hsl(240 10% 3.9%);
            --muted-foreground: hsl(240 4.8% 46.1%);
            --card: hsl(0 0% 100%);
            --border: hsl(240 5.9% 90%);
          }
          .maplibregl-popup-content {
            color: var(--foreground);
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 0.75rem;
            box-shadow: 0 10px 30px -12px rgba(0,0,0,0.35);
            padding: 16px 20px;
            padding-right: 64px; /* generous space for close button */
            min-width: 190px;
            text-align: center;
          }
          .maplibregl-popup-tip {
            border-top-color: var(--card);
          }
          .maplibregl-popup-close-button {
            color: var(--foreground);
            background: transparent;
            border: none;
            border-radius: 6px;
            width: 30px;
            height: 30px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            font-weight: 600;
            top: 12px;
            right: 12px;
            padding-bottom: 2px;
            box-shadow: none;
          }
          .maplibregl-popup-content a {
            color: var(--foreground);
            font-weight: 800;
            font-size: 17px;
            text-decoration: none;
            line-height: 1.2;
          }
          .maplibregl-popup-content a:hover {
            text-decoration: underline;
          }
          .map-marker {
            --marker-color: #0ea5e9;
            width: 20px;
            height: 20px;
            border: 3px solid #fff;
            border-radius: 999px;
            background: var(--marker-color);
            box-shadow: 0 8px 18px -8px rgba(0,0,0,0.4);
            transition: transform 150ms ease, box-shadow 150ms ease;
            cursor: pointer;
          }
          .map-marker:hover {
            transform: scale(1.2);
            box-shadow: 0 10px 24px -10px rgba(0,0,0,0.45);
          }
          .maplibregl-canvas {
            filter: saturate(1.05) contrast(1.03);
          }
          .maplibregl-ctrl-attrib {
            color: var(--foreground);
            background: transparent;
            border: none;
            padding: 4px 6px;
            margin: 8px;
            box-shadow: none;
          }
          .maplibregl-ctrl-attrib a {
            color: var(--foreground);
            text-decoration: underline;
          }
        `;
        document.head.appendChild(style);
      }

      // Load JS if not present
      if (!(window as unknown as { maplibregl?: typeof import("maplibre-gl") }).maplibregl) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js";
          script.onload = () => resolve();
          script.onerror = (err) => reject(err);
          document.body.appendChild(script);
        });
      }
      return (window as unknown as { maplibregl: typeof import("maplibre-gl") }).maplibregl || null;
    }

    loadMapLibre()
      .then((maplibregl) => {
        if (!isMounted || !mapContainerRef.current || !maplibregl) return;

        const first = workspaceWithCoords[0];
        const center: [number, number] = [first.longitude!, first.latitude!];

        const primaryColor =
          typeof window !== "undefined"
            ? getComputedStyle(document.documentElement)
                .getPropertyValue("--primary")
                .trim() || "#0ea5e9"
            : "#0ea5e9";

        // Initialize map once
        if (!mapInstanceRef.current) {
          mapInstanceRef.current = new maplibregl.Map({
            container: mapContainerRef.current,
            style: {
              version: 8,
              sources: {
                osm: {
                  type: "raster",
                  tiles: [
                    "https://cartodb-basemaps-a.global.ssl.fastly.net/rastertiles/voyager/{z}/{x}/{y}.png",
                    "https://cartodb-basemaps-b.global.ssl.fastly.net/rastertiles/voyager/{z}/{x}/{y}.png",
                    "https://cartodb-basemaps-c.global.ssl.fastly.net/rastertiles/voyager/{z}/{x}/{y}.png",
                    "https://cartodb-basemaps-d.global.ssl.fastly.net/rastertiles/voyager/{z}/{x}/{y}.png"
                  ],
                  tileSize: 256,
                  attribution: "© OpenStreetMap contributors, © CARTO",
                },
              },
              layers: [
                {
                  id: "osm",
                  type: "raster",
                  source: "osm",
                },
              ],
            },
            center,
            zoom: 13,
            attributionControl: true,
          });
        }

        // Remove existing markers (stored on map instance)
        const mapInstance = mapInstanceRef.current;
        if (!mapInstance) return;

        if (mapInstance._markers) {
          mapInstance._markers.forEach((m: import("maplibre-gl").Marker) => m.remove());
        }
        mapInstance._markers = [];

        const bounds = new maplibregl.LngLatBounds();

        workspaceWithCoords.forEach((workspace) => {
          const coords: [number, number] = [workspace.longitude!, workspace.latitude!];
          const markerEl = document.createElement("div");
          markerEl.className = "map-marker";
          markerEl.style.setProperty("--marker-color", primaryColor || "#0ea5e9");

          const popupHtml = `
            <a href="/cities/${city.slug}/${workspace.slug}">
              ${workspace.name}
            </a>
          `;

          const marker = new maplibregl.Marker({ element: markerEl })
            .setLngLat(coords)
            .setPopup(new maplibregl.Popup({ offset: 12 }).setHTML(popupHtml))
            .addTo(mapInstance);
          mapInstance._markers = mapInstance._markers ?? [];
          mapInstance._markers.push(marker);
          bounds.extend(coords);
        });

        if (workspaceWithCoords.length > 1) {
          mapInstanceRef.current.fitBounds(bounds, { padding: 48 });
        } else {
          mapInstanceRef.current.setCenter(center);
          mapInstanceRef.current.setZoom(14);
        }
      })
      .catch((err) => console.error("Failed to load map", err));

    return () => {
      isMounted = false;
    };
  }, [workspaces]);

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

        {/* Map View */}
        {workspaces.some((w) => w.latitude && w.longitude) && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-3xl font-bold flex items-center gap-3">
                <MapIcon className="h-8 w-8" />
                Map
              </h2>
            </div>
            <div className="rounded-xl border border-border bg-card overflow-hidden h-[420px]">
              <div ref={mapContainerRef} className="w-full h-full" />
            </div>
          </div>
        )}

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
