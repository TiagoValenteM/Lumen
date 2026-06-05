import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getDisplayName } from "@/lib/utils";

export type MemberHomeData = {
  displayName: string;
  isAdmin: boolean;
  savedCount: number;
  visitedCount: number;
  submittedCount: number;
  pendingCount: number;
  recentSaved: HomeWorkspaceSummary[];
  recentSubmissions: HomeSubmissionSummary[];
};

export type HomeWorkspaceSummary = {
  id: string;
  name: string;
  slug: string;
  cityName: string | null;
  citySlug: string | null;
};

export type HomeSubmissionSummary = HomeWorkspaceSummary & {
  status: string | null;
};

type ProfileRow = {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  tag: string | null;
  is_admin?: boolean | null;
};

type WorkspaceCityRelation = { name: string | null; slug: string | null } | { name: string | null; slug: string | null }[] | null;

type SavedWorkspaceRow = {
  workspace_id: string;
  workspaces: {
    id: string;
    name: string;
    slug: string;
    city: WorkspaceCityRelation;
  } | null;
};

type SubmissionRow = {
  id: string;
  name: string;
  slug: string;
  status: string | null;
  city: WorkspaceCityRelation;
};

export async function getMemberHomeData(supabase: SupabaseClient, user: User): Promise<MemberHomeData> {
  const [
    profileResult,
    savedCountResult,
    visitedCountResult,
    submittedCountResult,
    pendingCountResult,
    recentSavedResult,
    recentSubmissionsResult,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("first_name, last_name, email, tag, is_admin")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("saved_workspaces")
      .select("*", { head: true, count: "exact" })
      .eq("user_id", user.id),
    supabase
      .from("visited_workspaces")
      .select("*", { head: true, count: "exact" })
      .eq("user_id", user.id),
    supabase
      .from("workspaces")
      .select("*", { head: true, count: "exact" })
      .eq("submitted_by", user.id),
    supabase
      .from("workspaces")
      .select("*", { head: true, count: "exact" })
      .eq("submitted_by", user.id)
      .in("status", ["pending", "under_review"]),
    supabase
      .from("saved_workspaces")
      .select(`
        workspace_id,
        workspaces(
          id,
          name,
          slug,
          city:cities(name, slug)
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("workspaces")
      .select(`
        id,
        name,
        slug,
        status,
        city:cities(name, slug)
      `)
      .eq("submitted_by", user.id)
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

  const profile = profileResult.data as ProfileRow | null;

  return {
    displayName: getDisplayName(
      profile?.first_name,
      profile?.last_name,
      profile?.tag,
      profile?.email ?? user.email ?? null
    ),
    isAdmin: Boolean(profile?.is_admin),
    savedCount: savedCountResult.count || 0,
    visitedCount: visitedCountResult.count || 0,
    submittedCount: submittedCountResult.count || 0,
    pendingCount: pendingCountResult.count || 0,
    recentSaved: ((recentSavedResult.data as SavedWorkspaceRow[] | null) || [])
      .map((row) => row.workspaces)
      .filter((workspace): workspace is NonNullable<SavedWorkspaceRow["workspaces"]> => Boolean(workspace))
      .map((workspace) => ({
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        cityName: getCityField(workspace.city)?.name ?? null,
        citySlug: getCityField(workspace.city)?.slug ?? null,
      })),
    recentSubmissions: ((recentSubmissionsResult.data as SubmissionRow[] | null) || []).map((workspace) => ({
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      status: workspace.status,
      cityName: getCityField(workspace.city)?.name ?? null,
      citySlug: getCityField(workspace.city)?.slug ?? null,
    })),
  };
}

function getCityField(city: WorkspaceCityRelation) {
  return Array.isArray(city) ? city[0] ?? null : city;
}
