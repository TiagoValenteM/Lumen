"use client";

import { useState } from "react";
import { deleteWorkspaceImage } from "@/lib/utils/image-upload";

export function useWorkspacePhotos(userId: string | undefined) {
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);

  const handlePhotoUploaded = (url: string) => {
    setUploadedPhotos((prev) => [...prev, url]);
  };

  const removeUploadedPhoto = async (index: number) => {
    const photoUrl = uploadedPhotos[index];
    if (!photoUrl || !userId) return;

    setUploadedPhotos((prev) => prev.filter((_, photoIndex) => photoIndex !== index));
    const result = await deleteWorkspaceImage(photoUrl, userId);

    if (!result.success) {
      console.error("Failed to delete removed upload:", result.error);
      alert("The photo was removed from the form, but we could not delete the uploaded file. Please try again or contact support.");
    }
  };

  const moveUploadedPhoto = (fromIndex: number, toIndex: number) => {
    setUploadedPhotos((prev) => {
      if (toIndex < 0 || toIndex >= prev.length) return prev;
      const next = [...prev];
      const [photo] = next.splice(fromIndex, 1);
      if (!photo) return prev;
      next.splice(toIndex, 0, photo);
      return next;
    });
  };

  const clearUploadedPhotos = () => {
    setUploadedPhotos([]);
  };

  const deleteUploadedPhotos = async () => {
    if (!userId) {
      clearUploadedPhotos();
      return;
    }

    const photosToDelete = uploadedPhotos;
    setUploadedPhotos([]);

    const results = await Promise.allSettled(photosToDelete.map((photoUrl) => deleteWorkspaceImage(photoUrl, userId)));
    const failedDelete = results.some((result) => result.status === "rejected" || !result.value.success);

    if (failedDelete) {
      console.error("Failed to delete one or more draft uploads:", results);
      alert("Draft cleared, but one or more uploaded photos could not be deleted from storage.");
    }
  };

  return {
    clearUploadedPhotos,
    deleteUploadedPhotos,
    handlePhotoUploaded,
    moveUploadedPhoto,
    removeUploadedPhoto,
    setUploadedPhotos,
    uploadedPhotos,
  };
}
