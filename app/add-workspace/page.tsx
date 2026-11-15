"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Clock, Trash2 } from "lucide-react";
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
import { InlineFeedback } from "@/components/shared/inline-feedback";
import { LoadingState, PageContainer, PageShell } from "@/components/shared/lumen-page";
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
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [attemptedSteps, setAttemptedSteps] = useState<Set<number>>(() => new Set());
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
  const { clearDraft, draftLoaded, draftSavedAt, draftUnavailable, getSubmissionId } = useAddWorkspaceDraft({
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

  if (authLoading || !user || !draftLoaded) return <LoadingState label={user ? "Loading your draft…" : "Checking session…"} />;

  const markStepAttempted = (step: number) => {
    setAttemptedSteps((prev) => {
      const next = new Set(prev);
      next.add(step);
      return next;
    });
  };

  const handleNext = () => {
    if (!canProceedToNext) {
      markStepAttempted(currentStep);
      requestAnimationFrame(() => {
        if (validationIssue) document.getElementById(validationIssue.field)?.focus();
      });
      return;
    }

    goToStep(currentStep + 1);
  };

  const goToStep = (step: number) => {
    setCurrentStep(step);
    requestAnimationFrame(() => document.getElementById("add-place-progress")?.focus());
  };

  const handleSubmit = async () => {
    if (!user || submitting) return;
    setSubmissionError(null);
    if (!canSubmit) {
      const needsPhotos = validationIssue?.field === "place-photos";
      markStepAttempted(needsPhotos ? 5 : 1);
      goToStep(needsPhotos ? 5 : 1);
      return;
    }
    setSubmitting(true);
    try {
      const workspaceId = await submitWorkspace(supabase, formData, uploadedPhotos, getSubmissionId());
      void fetch(`/api/workspaces/${workspaceId}/enrich`, { method: "POST", keepalive: true })
        .then((response) => {
          if (!response.ok) console.warn("Workspace submitted, but AI enrichment could not be queued", response.status);
        })
        .catch((enrichmentError) => {
          console.warn("Workspace submitted, but AI enrichment could not be queued", enrichmentError);
        });
      clearDraft();
      resetForm();
      setAttemptedSteps(new Set());
      clearUploadedPhotos();
      router.push("/profile/my-workspaces?submitted=1");
    } catch (error) {
      console.error("Error submitting workspace:", error);
      setSubmissionError(error instanceof Error ? error.message : "Could not submit your place. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const { canProceedToNext, canSubmit, validationIssue } = getStepState(uploadedPhotos);
  const visibleIssue = attemptedSteps.has(currentStep) ? validationIssue : null;
  const handleClearDraft = async () => {
    setSubmissionError(null);
    clearDraft();
    resetForm();
    setAttemptedSteps(new Set());
    await deleteUploadedPhotos();
  };

  return (
    <PageShell>
      <PageContainer size="md" className="gap-4 py-4 pb-24 sm:gap-6 sm:py-8">
        <Link href="/" className="keyboard-focus inline-flex min-h-11 w-fit items-center gap-2 rounded-sm text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        <h1 className="text-3xl font-semibold sm:text-4xl">Add a place</h1>

        <ProgressSteps currentStep={currentStep} steps={addWorkspaceStepLabels} />

        {draftUnavailable && <InlineFeedback>Your draft can’t be saved in this browser. Keep this tab open until you submit.</InlineFeedback>}
        {!draftUnavailable && draftSavedAt && (
          <div className="flex flex-wrap items-center justify-between gap-x-3 rounded-lg bg-muted px-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground" role="status">
              <Clock className="h-4 w-4" aria-hidden="true" />
              Draft saved {formatDraftTime(draftSavedAt)}
            </div>
            <Button type="button" variant="ghost" className="min-h-11" onClick={handleClearDraft} disabled={submitting}>
              <Trash2 className="h-4 w-4" />
              Clear draft
            </Button>
          </div>
        )}

        {/* Step 1: Basic Information */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <BasicInformationStep formData={formData} setFormData={setFormData} updateField={updateField} issue={visibleIssue} />
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
            error={visibleIssue?.message}
            uploadedPhotos={uploadedPhotos}
            onPhotoMoved={moveUploadedPhoto}
            onPhotoUploaded={handlePhotoUploaded}
            onPhotoRemoved={removeUploadedPhoto}
          />
        )}

        {currentStep === 6 && (
          <ReviewStep formData={formData} uploadedPhotos={uploadedPhotos} onEditStep={goToStep} />
        )}

        {currentStep === 6 && submissionError && <InlineFeedback error>{submissionError}</InlineFeedback>}

        <FormNavigation
          currentStep={currentStep}
          totalSteps={totalAddWorkspaceSteps}
          submitting={submitting}
          onPrevious={() => goToStep(currentStep - 1)}
          onNext={handleNext}
          onSubmit={handleSubmit}
        />
      </PageContainer>
    </PageShell>
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
