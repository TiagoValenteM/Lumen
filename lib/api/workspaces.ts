import { createClient } from "@/lib/supabase/client";
import type { City, Workspace, WorkspaceDetail } from "@/lib/types";

export async function getWorkspacesByCity(citySlug: string): Promise<Workspace[]> {
  const supabase = createClient();
  
  const { data: cityData } = await supabase
    .from('cities')
    .select('id')
    .eq('slug', citySlug)
    .single();

  if (!cityData) return [];

  const { data: workspacesData } = await supabase
    .from('workspaces')
    .select(`
      id, name, slug, type, short_description, address,
      has_wifi, has_power_outlets, has_coffee,
      overall_rating, total_reviews,
      workspace_photos!workspace_id(url)
    `)
    .eq('city_id', cityData.id)
    .eq('status', 'approved')
    .order('name');

  if (!workspacesData) return [];

  // Transform the data to match Workspace type
  return workspacesData.map((workspace: any) => ({
    ...workspace,
    primary_photo: workspace.workspace_photos?.[0] || null,
    workspace_photos: undefined, // Remove the raw photos array
  }));
}

export async function getWorkspaceDetail(
  citySlug: string,
  workspaceSlug: string
): Promise<{ city: City | null; workspace: WorkspaceDetail | null }> {
  const supabase = createClient();

  const { data: cityData } = await supabase
    .from('cities')
    .select('id, name, slug, country')
    .eq('slug', citySlug)
    .single();

  if (!cityData) {
    return { city: null, workspace: null };
  }

  const { data: workspaceData } = await supabase
    .from('workspaces')
    .select('*')
    .eq('slug', workspaceSlug)
    .eq('city_id', cityData.id)
    .eq('status', 'approved')
    .single();

  return {
    city: cityData,
    workspace: workspaceData,
  };
}

export async function getCities(): Promise<City[]> {
  const supabase = createClient();
  
  const { data: cityData } = await supabase
    .from("cities")
    .select("id, name, slug, country, workspace_count")
    .order("country", { ascending: true })
    .order("name", { ascending: true });

  return cityData || [];
}
