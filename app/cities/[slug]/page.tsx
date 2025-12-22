"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { WorkspaceCard } from "@/components/WorkspaceCard";
import { ArrowLeft, MapPin, Loader2, Building2 } from "lucide-react";

interface City {
  id: string;
  name: string;
  slug: string;
  country: string;
  workspace_count: number;
  description: string | null;
}

interface Workspace {
  id: string;
  name: string;
  slug: string;
  type: string;
  short_description: string | null;
  address: string | null;
  has_wifi: boolean;
  has_power_outlets: boolean;
  has_coffee: boolean;
  overall_rating: number | null;
  total_reviews: number;
  primary_photo?: {
    url: string;
  } | null;
}

export default function CityPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [city, setCity] = useState<City | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

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
              {workspaces.length} {workspaces.length === 1 ? 'space' : 'spaces'} found
            </div>
          </div>

          {workspaces.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {workspaces.map((workspace) => (
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
