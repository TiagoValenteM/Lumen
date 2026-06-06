"use client";

import { useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { defaultAddWorkspaceFormData } from "../_lib/defaults";
import type { AddWorkspaceFormData } from "../_lib/types";

const legacyDraftStorageKey = "lumen:add-place-draft:v1";

const getDraftStorageKey = (userId: string) => `lumen:add-place-draft:v1:${userId}`;

type AddWorkspaceDraft = {
  formData: AddWorkspaceFormData;
  uploadedPhotos: string[];
  savedAt: string;
};

type UseAddWorkspaceDraftParams = {
  formData: AddWorkspaceFormData;
  setFormData: Dispatch<SetStateAction<AddWorkspaceFormData>>;
  setUploadedPhotos: Dispatch<SetStateAction<string[]>>;
  uploadedPhotos: string[];
  userId: string | undefined;
};

export function useAddWorkspaceDraft({ formData, setFormData, setUploadedPhotos, uploadedPhotos, userId }: UseAddWorkspaceDraftParams) {
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const skipNextSaveRef = useRef(false);

  useEffect(() => {
    if (!userId) return;

    const timer = window.setTimeout(() => {
      const draftStorageKey = getDraftStorageKey(userId);
      window.localStorage.removeItem(legacyDraftStorageKey);
      const rawDraft = window.localStorage.getItem(draftStorageKey);
      if (!rawDraft) {
        setDraftLoaded(true);
        return;
      }

      try {
        const draft = JSON.parse(rawDraft) as Partial<AddWorkspaceDraft>;
        if (draft.formData) {
          setFormData({ ...defaultAddWorkspaceFormData, ...draft.formData });
        }
        if (Array.isArray(draft.uploadedPhotos)) {
          setUploadedPhotos(draft.uploadedPhotos.filter((photo): photo is string => typeof photo === "string"));
        }
        setDraftSavedAt(typeof draft.savedAt === "string" ? draft.savedAt : null);
        skipNextSaveRef.current = true;
      } catch {
        window.localStorage.removeItem(draftStorageKey);
      } finally {
        setDraftLoaded(true);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [setFormData, setUploadedPhotos, userId]);

  useEffect(() => {
    if (!draftLoaded || !userId) return;
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }

    const timer = window.setTimeout(() => {
      const draftStorageKey = getDraftStorageKey(userId);
      const hasMeaningfulDraft =
        formData.name.trim() ||
        formData.address.trim() ||
        formData.latitude !== null ||
        uploadedPhotos.length > 0;

      if (!hasMeaningfulDraft) {
        window.localStorage.removeItem(draftStorageKey);
        setDraftSavedAt(null);
        return;
      }

      try {
        const savedAt = new Date().toISOString();
        const draft: AddWorkspaceDraft = { formData, uploadedPhotos, savedAt };
        window.localStorage.setItem(draftStorageKey, JSON.stringify(draft));
        setDraftSavedAt(savedAt);
      } catch (error) {
        console.error("Failed to save add-place draft:", error);
      }
    }, 600);

    return () => window.clearTimeout(timer);
  }, [draftLoaded, formData, uploadedPhotos, userId]);

  const clearDraft = () => {
    if (userId) {
      window.localStorage.removeItem(getDraftStorageKey(userId));
    }
    setDraftSavedAt(null);
  };

  return {
    clearDraft,
    draftLoaded,
    draftSavedAt,
  };
}
