import { useState, useEffect, useCallback } from "react";
import { checkIfWorkspaceSaved, saveWorkspace, unsaveWorkspace } from "@/lib/api";

export function useSavedWorkspace(userId: string | undefined, workspaceId: string) {
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkSaved() {
      if (!userId) {
        setIsSaved(false);
        setLoading(false);
        return;
      }

      setLoading(true);
      const saved = await checkIfWorkspaceSaved(userId, workspaceId);
      setIsSaved(saved);
      setLoading(false);
    }

    checkSaved();
  }, [userId, workspaceId]);

  const toggleSave = useCallback(async () => {
    if (!userId) return;

    try {
      if (isSaved) {
        await unsaveWorkspace(userId, workspaceId);
        setIsSaved(false);
      } else {
        await saveWorkspace(userId, workspaceId);
        setIsSaved(true);
      }
    } catch (error) {
      console.error("Error toggling save:", error);
      throw error;
    }
  }, [userId, workspaceId, isSaved]);

  return {
    isSaved,
    loading,
    toggleSave,
  };
}
