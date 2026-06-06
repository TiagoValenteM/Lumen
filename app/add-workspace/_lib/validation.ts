import type { AddWorkspaceFormData } from "./types";

export const totalAddWorkspaceSteps = 6;

export function isAddWorkspaceStepValid(step: number, formData: AddWorkspaceFormData, uploadedPhotos: string[]) {
  switch (step) {
    case 1:
      return Boolean(formData.name.trim() && formData.type && formData.latitude !== null && formData.longitude !== null);
    case 2:
      if (formData.has_wifi && !formData.wifi_speed) return false;
      if (formData.has_power_outlets && !formData.power_outlet_availability) return false;
      return true;
    case 3:
    case 4:
      return true;
    case 5:
      return uploadedPhotos.length > 0;
    case 6:
      return Boolean(formData.name.trim() && formData.type && formData.latitude !== null && formData.longitude !== null && uploadedPhotos.length > 0);
    default:
      return true;
  }
}

export function getAddWorkspaceValidationMessage(step: number, formData: AddWorkspaceFormData, uploadedPhotos: string[] = []) {
  if (step === 1) return "Choose a location and add a place name before continuing.";
  if (step === 2 && formData.has_wifi && !formData.wifi_speed) return "Please select WiFi speed";
  if (step === 2 && formData.has_power_outlets && !formData.power_outlet_availability) {
    return "Please select power outlet availability";
  }
  if (step === 5 && uploadedPhotos.length === 0) return "Add at least one photo before reviewing your submission.";
  return null;
}
