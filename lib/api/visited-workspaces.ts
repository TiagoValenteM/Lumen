import { createClient } from "@/lib/supabase/client";

export async function checkIfWorkspaceVisited(
  userId: string,
  workspaceId: string
): Promise<boolean> {
  if (!userId || !workspaceId) return false;

  const supabase = createClient();

  const { data, error } = await supabase
    .from("visited_workspaces")
    .select("id")
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) {
    console.error("Error checking visited workspace:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return false;
  }

  return !!data;
}

export async function markWorkspaceAsVisited(
  userId: string,
  workspaceId: string
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("visited_workspaces")
    .insert({
      user_id: userId,
      workspace_id: workspaceId,
    });

  if (error) throw error;
}

export async function unmarkWorkspaceAsVisited(
  userId: string,
  workspaceId: string
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("visited_workspaces")
    .delete()
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId);

  if (error) throw error;
}

export async function getVisitedWorkspaces(userId: string): Promise<string[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("visited_workspaces")
    .select("workspace_id")
    .eq("user_id", userId);

  if (error) {
    console.error("Error fetching visited workspaces:", error);
    return [];
  }

  return data.map((item) => item.workspace_id);
}
