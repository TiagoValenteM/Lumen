"use client";

import { useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { defaultAddWorkspaceFormData } from "../_lib/defaults";
import type { AddWorkspaceFormData } from "../_lib/types";
import { getResumableStep } from "../_lib/validation";

const legacyDraftStorageKey = "lumen:add-place-draft:v1";

const getDraftStorageKey = (userId: string) => `lumen:add-place-draft:v1:${userId}`;
const getSubmissionStorageKey = (userId: string) => `${getDraftStorageKey(userId)}:submission`;

type AddWorkspaceDraft = {
  formData: AddWorkspaceFormData;
  uploadedPhotos: string[];
  savedAt: string;
  workFactsVersion: 1;
  currentStep: number;
};

type UseAddWorkspaceDraftParams = {
  formData: AddWorkspaceFormData;
  currentStep: number;
  setCurrentStep: Dispatch<SetStateAction<number>>;
  setFormData: Dispatch<SetStateAction<AddWorkspaceFormData>>;
  setUploadedPhotos: Dispatch<SetStateAction<string[]>>;
  uploadedPhotos: string[];
  userId: string | undefined;
};

export function useAddWorkspaceDraft({ formData, currentStep, setCurrentStep, setFormData, setUploadedPhotos, uploadedPhotos, userId }: UseAddWorkspaceDraftParams) {
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const draftLoaded = userId !== undefined && loadedFor === userId;
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const skipNextSaveRef = useRef(false);
  const submissionIdRef = useRef<{ userId: string; id: string } | null>(null);
  const saveGeneration = useRef(0);

  useEffect(() => {
    if (!userId) return;

    const timer = window.setTimeout(() => {
      const draftStorageKey = getDraftStorageKey(userId);
      skipNextSaveRef.current = false;
      let restored = defaultAddWorkspaceFormData;
      let photos: string[] = [];
      let step = 1;
      let savedAt: string | null = null;
      try {
        window.localStorage.removeItem(legacyDraftStorageKey);
        const rawDraft = window.localStorage.getItem(draftStorageKey);
        if (!rawDraft) return;
        const draft = JSON.parse(rawDraft) as Partial<AddWorkspaceDraft>;
        if (draft.formData) {
          const candidate = { ...defaultAddWorkspaceFormData, ...draft.formData };
          if (!draft.workFactsVersion) {
            // Legacy drafts could not distinguish these defaults from deliberate answers.
            if (candidate.has_wifi === true && candidate.wifi_speed === "moderate") {
              candidate.has_wifi = null;
              candidate.wifi_speed = "";
            }
            if (candidate.has_power_outlets === true && candidate.power_outlet_availability === 3) {
              candidate.has_power_outlets = null;
              candidate.power_outlet_availability = 0;
            }
            if (candidate.laptop_friendly === true) candidate.laptop_friendly = null;
            if (candidate.time_limit_hours === 0) candidate.time_limit_hours = null;
          }
          photos = Array.isArray(draft.uploadedPhotos) ? draft.uploadedPhotos.filter((photo): photo is string => typeof photo === "string") : [];
          step = getResumableStep(draft.currentStep, candidate, photos);
          restored = candidate;
        }
        savedAt = typeof draft.savedAt === "string" ? draft.savedAt : null;
        skipNextSaveRef.current = true;
      } catch {
        // Browser storage can be unavailable; the new form still works.
      } finally {
        setFormData(restored);
        setUploadedPhotos(photos);
        setCurrentStep(step);
        setDraftSavedAt(savedAt);
        setLoadedFor(userId);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [setCurrentStep, setFormData, setUploadedPhotos, userId]);

  useEffect(() => {
    if (!draftLoaded || !userId) return;
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }

    const generation = saveGeneration.current;
    let persisted = false;
    const save = () => {
      if (persisted || generation !== saveGeneration.current) return;
      persisted = true;
      const draftStorageKey = getDraftStorageKey(userId);
      const hasMeaningfulDraft =
        formData.name.trim() ||
        formData.address.trim() ||
        formData.latitude !== null ||
        uploadedPhotos.length > 0;

      try {
        if (!hasMeaningfulDraft) {
          window.localStorage.removeItem(draftStorageKey);
          window.localStorage.removeItem(getSubmissionStorageKey(userId));
          setDraftSavedAt(null);
          return;
        }
        const savedAt = new Date().toISOString();
        const draft: AddWorkspaceDraft = { formData, uploadedPhotos, savedAt, currentStep, workFactsVersion: 1 };
        window.localStorage.setItem(draftStorageKey, JSON.stringify(draft));
        setDraftSavedAt(savedAt);
      } catch (error) {
        console.error("Failed to save add-place draft:", error);
      }
    };
    const timer = window.setTimeout(save, 0);
    window.addEventListener("pagehide", save);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pagehide", save);
    };
  }, [currentStep, draftLoaded, formData, uploadedPhotos, userId]);

  const clearDraft = () => {
    saveGeneration.current += 1;
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
