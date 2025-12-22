import { useState, useEffect, useCallback } from "react";
import { checkIfWorkspaceVisited, markWorkspaceAsVisited, unmarkWorkspaceAsVisited } from "@/lib/api";

export function useVisitedWorkspace(userId: string | undefined, workspaceId: string) {
  const [hasVisited, setHasVisited] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkVisited() {
      if (!userId) {
        setHasVisited(false);
        setLoading(false);
        return;
      }

      setLoading(true);
      const visited = await checkIfWorkspaceVisited(userId, workspaceId);
      setHasVisited(visited);
      setLoading(false);
    }

    checkVisited();
  }, [userId, workspaceId]);

  const toggleVisited = useCallback(async () => {
    if (!userId) return;

    try {
      if (hasVisited) {
        await unmarkWorkspaceAsVisited(userId, workspaceId);
        setHasVisited(false);
      } else {
        await markWorkspaceAsVisited(userId, workspaceId);
        setHasVisited(true);
      }
    } catch (error) {
      console.error("Error toggling visited:", error);
      throw error;
    }
  }, [userId, workspaceId, hasVisited]);

  return {
    hasVisited,
    loading,
    toggleVisited,
  };
}
