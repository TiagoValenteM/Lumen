import type { AddWorkspaceFormData } from "./types";

export const totalAddWorkspaceSteps = 6;

function hasCity(formData: AddWorkspaceFormData) {
  return Boolean(formData.city_name.trim() && formData.country.trim());
}

export function isAddWorkspaceStepValid(step: number, formData: AddWorkspaceFormData, uploadedPhotos: string[]): boolean {
  switch (step) {
    case 1:
      return Boolean(formData.name.trim() && formData.type && formData.latitude !== null && formData.longitude !== null && hasCity(formData));
    case 2:
      return true;
    case 3:
    case 4:
      return true;
    case 5:
      return uploadedPhotos.length > 0;
    case 6:
      return isAddWorkspaceStepValid(1, formData, uploadedPhotos) && uploadedPhotos.length > 0;
    default:
      return true;
  }
}

export function getAddWorkspaceValidationMessage(step: number, formData: AddWorkspaceFormData, uploadedPhotos: string[] = []) {
  if (step === 1) {
    if (!formData.name.trim()) return "Add the place name before continuing.";
    if (!formData.type) return "Choose what type of place this is before continuing.";
    if (formData.latitude === null || formData.longitude === null) return "Select a location before continuing.";
    if (!hasCity(formData)) return "Enter the city and country before continuing.";
  }
  if (step === 5 && uploadedPhotos.length === 0) return "Add at least one photo before reviewing your submission.";
  if (step === 6) {
    if (!formData.name.trim()) return "Add the place name before submitting.";
    if (!formData.type) return "Choose what type of place this is before submitting.";
    if (formData.latitude === null || formData.longitude === null) return "Select a location before submitting.";
    if (!hasCity(formData)) return "Enter the city and country in Basics before submitting.";
    if (uploadedPhotos.length === 0) return "Add at least one photo before submitting.";
  }
  return null;
}
