"use client";

import { useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { defaultAddWorkspaceFormData } from "../_lib/defaults";
import type { AddWorkspaceFormData } from "../_lib/types";

const legacyDraftStorageKey = "lumen:add-place-draft:v1";

const getDraftStorageKey = (userId: string) => `lumen:add-place-draft:v1:${userId}`;
const getSubmissionStorageKey = (userId: string) => `${getDraftStorageKey(userId)}:submission`;

type AddWorkspaceDraft = {
  formData: AddWorkspaceFormData;
  uploadedPhotos: string[];
  savedAt: string;
  workFactsVersion: 1;
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
  const submissionIdRef = useRef<{ userId: string; id: string } | null>(null);

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
          const restored = { ...defaultAddWorkspaceFormData, ...draft.formData };
          if (!draft.workFactsVersion) {
            // Legacy drafts could not distinguish these defaults from deliberate answers.
            if (restored.has_wifi === true && restored.wifi_speed === "moderate") {
              restored.has_wifi = null;
              restored.wifi_speed = "";
            }
            if (restored.has_power_outlets === true && restored.power_outlet_availability === 3) {
              restored.has_power_outlets = null;
              restored.power_outlet_availability = 0;
            }
            if (restored.laptop_friendly === true) restored.laptop_friendly = null;
            if (restored.time_limit_hours === 0) restored.time_limit_hours = null;
          }
          setFormData(restored);
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
        window.localStorage.removeItem(getSubmissionStorageKey(userId));
        setDraftSavedAt(null);
        return;
      }

      try {
        const savedAt = new Date().toISOString();
        const draft: AddWorkspaceDraft = { formData, uploadedPhotos, savedAt, workFactsVersion: 1 };
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
      try {
        window.localStorage.removeItem(getDraftStorageKey(userId));
        window.localStorage.removeItem(getSubmissionStorageKey(userId));
      } catch {
        // The form still resets when browser storage is disabled.
      }
    }
    submissionIdRef.current = null;
    setDraftSavedAt(null);
  };

  const getSubmissionId = () => {
    if (!userId) throw new Error("Sign in to submit a place.");
    if (submissionIdRef.current?.userId === userId) return submissionIdRef.current.id;
    let id: string = crypto.randomUUID();
    try {
      const stored = window.localStorage.getItem(getSubmissionStorageKey(userId));
      if (stored && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(stored)) id = stored;
      else window.localStorage.setItem(getSubmissionStorageKey(userId), id);
    } catch {
      // Retries still share an ID for the lifetime of this page.
    }
    submissionIdRef.current = { userId, id };
    return id;
  };

  return {
    clearDraft,
    getSubmissionId,
    draftLoaded,
    draftSavedAt,
  };
}
