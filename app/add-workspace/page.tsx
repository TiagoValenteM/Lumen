"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Clock, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { AmbianceAmenitiesStep } from "./_components/ambiance-amenities-step";
import { BasicInformationStep } from "./_components/basic-information-step";
import { DuplicateCandidates } from "./_components/duplicate-candidates";
import { FoodPoliciesStep } from "./_components/food-policies-step";
import { FormNavigation } from "./_components/form-navigation";
import { PhotosStep } from "./_components/photos-step";
import { ProgressSteps } from "./_components/progress-steps";
import { ProductivityStep } from "./_components/productivity-step";
import { ReviewStep } from "./_components/review-step";
import { ValidationMessage } from "./_components/validation-message";
import { Button } from "@/components/ui/button";
import { useAddWorkspaceDraft } from "./_hooks/use-add-workspace-draft";
import { useAddWorkspaceForm } from "./_hooks/use-add-workspace-form";
import { useDuplicateWorkspaceCheck } from "./_hooks/use-duplicate-workspace-check";
import { useWorkspacePhotos } from "./_hooks/use-workspace-photos";
import { submitWorkspace } from "./_lib/submit-workspace";
import { totalAddWorkspaceSteps } from "./_lib/validation";

const addWorkspaceStepLabels = ["Basics", "Work setup", "Ambiance", "Policies", "Photos", "Review"];

export default function AddWorkspacePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const supabase = useMemo(() => createClient(), []);
  const { currentStep, formData, getStepState, resetForm, setCurrentStep, setFormData, updateField } = useAddWorkspaceForm();
  const {
    clearUploadedPhotos,
    deleteUploadedPhotos,
    handlePhotoUploaded,
    moveUploadedPhoto,
    removeUploadedPhoto,
    setUploadedPhotos,
    uploadedPhotos,
  } = useWorkspacePhotos(user?.id);
  const { canCheckDuplicates, checkingDuplicates, duplicateCandidates, duplicateCheckError } = useDuplicateWorkspaceCheck(supabase, formData);
  const { clearDraft, draftLoaded, draftSavedAt } = useAddWorkspaceDraft({
    formData,
    setFormData,
    setUploadedPhotos,
    uploadedPhotos,
    userId: user?.id,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/add-workspace');
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div className="min-h-full bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleSubmit = async () => {
    if (!user) return;
    if (uploadedPhotos.length === 0) {
      alert("Please upload at least one photo before submitting.");
      return;
    }
    if (formData.latitude === null || formData.longitude === null) {
      alert("Please find the place location so we can save its coordinates.");
      return;
    }

    setSubmitting(true);
    try {
      const { citySlug } = await submitWorkspace(supabase, formData, uploadedPhotos, user.id);
      clearDraft();
      resetForm();
      clearUploadedPhotos();
      router.push(`/profile/my-workspaces?submitted=1&city=${citySlug}`);
    } catch (error) {
      console.error("Error submitting workspace:", error);
      alert("Failed to submit place. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const { canProceedToNext, canSubmit, validationMessage } = getStepState(uploadedPhotos);
  const handleClearDraft = async () => {
    clearDraft();
    resetForm();
    await deleteUploadedPhotos();
  };

  return (
    <div className="min-h-full bg-background">
      <div className="mx-auto max-w-4xl px-4 py-5 pb-28 sm:px-6 sm:py-8 sm:pb-8">
        <Link href="/" className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground sm:mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        <div className="mb-6">
          <p className="mb-2 text-sm font-medium text-primary">Step {currentStep} of {totalAddWorkspaceSteps}</p>
          <h1 className="mb-2 text-3xl font-bold tracking-tight sm:text-4xl">Add a place</h1>
          <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
            Start with the essentials. Details can be lightweight; admins review submissions before they go public.
          </p>
        </div>

        <ProgressSteps currentStep={currentStep} steps={addWorkspaceStepLabels} />

        {draftLoaded && draftSavedAt && (
          <div className="mb-6 flex flex-col gap-3 rounded-xl border border-border/30 bg-muted/15 p-4 text-sm shadow-sm shadow-black/5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              Draft saved {formatDraftTime(draftSavedAt)}
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={handleClearDraft}>
              <Trash2 className="h-4 w-4" />
              Clear draft
            </Button>
          </div>
        )}

        {/* Step 1: Basic Information */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <BasicInformationStep formData={formData} setFormData={setFormData} updateField={updateField} />
            <DuplicateCandidates
              candidates={canCheckDuplicates ? duplicateCandidates : []}
              loading={canCheckDuplicates && checkingDuplicates}
              error={canCheckDuplicates ? duplicateCheckError : null}
            />
          </div>
        )}

        {/* Step 2: Productivity Features */}
        {currentStep === 2 && (
          <ProductivityStep formData={formData} updateField={updateField} />
        )}

        {/* Step 3: Ambiance & Amenities */}
        {currentStep === 3 && (
          <AmbianceAmenitiesStep formData={formData} updateField={updateField} />
        )}

        {/* Step 4: Food, Beverage & Policies */}
        {currentStep === 4 && (
          <FoodPoliciesStep formData={formData} updateField={updateField} />
        )}

        {/* Step 5: Photos */}
        {currentStep === 5 && (
          <PhotosStep
            uploadedPhotos={uploadedPhotos}
            onPhotoMoved={moveUploadedPhoto}
            onPhotoUploaded={handlePhotoUploaded}
            onPhotoRemoved={removeUploadedPhoto}
          />
        )}

        {currentStep === 6 && (
          <ReviewStep formData={formData} uploadedPhotos={uploadedPhotos} onEditStep={setCurrentStep} />
        )}

        <ValidationMessage message={validationMessage} />

        <FormNavigation
          currentStep={currentStep}
          totalSteps={totalAddWorkspaceSteps}
          submitting={submitting}
          canProceedToNext={canProceedToNext}
          canSubmit={canSubmit}
          onPrevious={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
          onNext={() => setCurrentStep((prev) => Math.min(totalAddWorkspaceSteps, prev + 1))}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}

function formatDraftTime(value: string) {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "recently";

  const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000));
  if (minutes < 1) return "just now";
  if (minutes === 1) return "1 minute ago";
  if (minutes < 60) return `${minutes} minutes ago`;
  return "earlier today";
}
