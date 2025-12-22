"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WorkspaceCard } from "@/components/features/workspace";
import { Loader2, MapPinCheck, ArrowLeft } from "lucide-react";
import type { Workspace } from "@/lib/types";

interface WorkspaceWithCity extends Workspace {
  city_slug?: string;
}

export default function VisitedWorkspacesPage() {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<WorkspaceWithCity[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadVisitedWorkspaces() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Get visited workspace IDs
        const { data: visitedData, error: visitedError } = await supabase
          .from("visited_workspaces")
          .select("workspace_id, visited_at")
          .eq("user_id", user.id)
          .order("visited_at", { ascending: false });

        if (visitedError) throw visitedError;

        if (!visitedData || visitedData.length === 0) {
          setWorkspaces([]);
          setLoading(false);
          return;
        }

        const workspaceIds = visitedData.map((item) => item.workspace_id);

        // Fetch workspace details
        const { data: workspacesData, error: workspacesError } = await supabase
          .from("workspaces")
          .select(`
            id, name, slug, type, short_description, address,
            has_wifi, has_power_outlets, has_coffee,
            overall_rating, total_reviews,
            city:cities!city_id(slug),
            workspace_photos!workspace_id(url)
          `)
          .in("id", workspaceIds)
          .eq("status", "approved");

        if (workspacesError) throw workspacesError;

        // Transform data to match Workspace type
        const transformedWorkspaces = (workspacesData || []).map(
          (workspace: {
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
            city?: { slug: string } | { slug: string }[];
            workspace_photos?: { url: string }[];
          }) => {
            const citySlug = Array.isArray(workspace.city)
              ? workspace.city[0]?.slug
              : workspace.city?.slug;

            return {
              ...workspace,
              primary_photo: workspace.workspace_photos?.[0] || null,
              workspace_photos: undefined,
              city_slug: citySlug,
              city: undefined,
            };
          }
        );

        setWorkspaces(transformedWorkspaces);
      } catch (error) {
        console.error("Error loading visited workspaces:", error);
      } finally {
        setLoading(false);
      }
    }

    loadVisitedWorkspaces();
  }, [user, supabase]);

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>
              Please sign in to view your visited workspaces.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" size="sm" asChild className="mb-4">
            <Link href="/profile">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Profile
            </Link>
          </Button>
          <div className="flex items-center gap-3 mb-2">
            <MapPinCheck className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold">Visited Workspaces</h1>
          </div>
          <p className="text-muted-foreground">
            Places you&apos;ve been to and experienced
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Visited</CardDescription>
              <CardTitle className="text-3xl">{workspaces.length}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Workspaces Grid */}
        {workspaces.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent className="pt-6">
              <MapPinCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No visited workspaces yet</h3>
              <p className="text-muted-foreground mb-6">
                Start exploring and mark the places you&apos;ve been to
              </p>
              <Button asChild>
                <Link href="/cities">Browse Workspaces</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workspaces.map((workspace) => (
              <WorkspaceCard
                key={workspace.id}
                workspace={workspace}
                citySlug={workspace.city_slug || ""}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
