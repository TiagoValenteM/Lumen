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

export function getAddWorkspaceValidationIssue(step: number, formData: AddWorkspaceFormData, uploadedPhotos: string[] = []) {
  if (step === 1 || step === 6) {
    if (formData.latitude === null || formData.longitude === null) return { field: "place-location", message: "Select a search result or place a pin on the map." };
    if (!formData.name.trim()) return { field: "name", message: "Enter the place name." };
    if (!formData.type) return { field: "type", message: "Choose a place type." };
    if (!formData.city_name.trim()) return { field: "place-city", message: "Enter the city." };
    if (!formData.country.trim()) return { field: "place-country", message: "Enter the country." };
  }
  if ((step === 5 || step === 6) && uploadedPhotos.length === 0) return { field: "place-photos", message: "Add at least one photo." };
  return null;
}
