"use client";

import { useState } from "react";
import { defaultAddWorkspaceFormData } from "../_lib/defaults";
import type { AddWorkspaceFieldValue, AddWorkspaceFormData, UpdateAddWorkspaceField } from "../_lib/types";
import { getAddWorkspaceValidationMessage, isAddWorkspaceStepValid, totalAddWorkspaceSteps } from "../_lib/validation";

export function useAddWorkspaceForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<AddWorkspaceFormData>(defaultAddWorkspaceFormData);

  const updateField: UpdateAddWorkspaceField = (field: keyof AddWorkspaceFormData, value: AddWorkspaceFieldValue) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const getStepState = (uploadedPhotos: string[]) => {
    const canProceedToNext = isAddWorkspaceStepValid(currentStep, formData, uploadedPhotos);
    const canSubmit = isAddWorkspaceStepValid(totalAddWorkspaceSteps, formData, uploadedPhotos);
    const validationMessage =
      !canProceedToNext && currentStep < totalAddWorkspaceSteps
        ? getAddWorkspaceValidationMessage(currentStep, formData, uploadedPhotos)
        : null;

    return { canProceedToNext, canSubmit, validationMessage };
  };

  const resetForm = () => {
    setCurrentStep(1);
    setFormData(defaultAddWorkspaceFormData);
  };

  return {
    currentStep,
    formData,
    getStepState,
    resetForm,
    setCurrentStep,
    setFormData,
    updateField,
  };
}
