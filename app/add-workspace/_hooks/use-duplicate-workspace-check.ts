"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { findPotentialWorkspaceDuplicates } from "../_lib/duplicate-detection";
import type { AddWorkspaceFormData, WorkspaceDuplicateCandidate } from "../_lib/types";

export function useDuplicateWorkspaceCheck(supabase: SupabaseClient, formData: AddWorkspaceFormData) {
  const [duplicateCandidates, setDuplicateCandidates] = useState<WorkspaceDuplicateCandidate[]>([]);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [duplicateCheckError, setDuplicateCheckError] = useState<string | null>(null);

  const canCheckDuplicates = formData.name.trim().length >= 3 && formData.latitude !== null && formData.longitude !== null;

  useEffect(() => {
    if (!canCheckDuplicates) {
      return;
    }

    let cancelled = false;

    const timer = window.setTimeout(async () => {
      try {
        if (cancelled) return;
        setCheckingDuplicates(true);
        setDuplicateCheckError(null);
        const candidates = await findPotentialWorkspaceDuplicates(supabase, {
          latitude: formData.latitude,
          longitude: formData.longitude,
          name: formData.name,
        });
        if (!cancelled) setDuplicateCandidates(candidates);
      } catch (error) {
        console.error("Failed to check duplicate workspaces:", error);
        if (!cancelled) {
          setDuplicateCandidates([]);
          setDuplicateCheckError("Could not check for duplicate places right now.");
        }
      } finally {
        if (!cancelled) setCheckingDuplicates(false);
      }
    }, 500);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [canCheckDuplicates, formData.latitude, formData.longitude, formData.name, supabase]);

  return {
    canCheckDuplicates,
    checkingDuplicates: canCheckDuplicates && checkingDuplicates,
    duplicateCandidates: canCheckDuplicates ? duplicateCandidates : [],
    duplicateCheckError: canCheckDuplicates ? duplicateCheckError : null,
  };
}
