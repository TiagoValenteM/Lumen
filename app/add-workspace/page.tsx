"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { deleteWorkspaceImage } from "@/lib/utils/image-upload";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { AmbianceAmenitiesStep } from "./_components/ambiance-amenities-step";
import { BasicInformationStep } from "./_components/basic-information-step";
import { DuplicateCandidates } from "./_components/duplicate-candidates";
import { FoodPoliciesStep } from "./_components/food-policies-step";
import { FormNavigation } from "./_components/form-navigation";
import { PhotosStep } from "./_components/photos-step";
import { ProgressSteps } from "./_components/progress-steps";
import { ProductivityStep } from "./_components/productivity-step";
import { ValidationMessage } from "./_components/validation-message";
import { defaultAddWorkspaceFormData } from "./_lib/defaults";
import { findPotentialWorkspaceDuplicates } from "./_lib/duplicate-detection";
import { submitWorkspace } from "./_lib/submit-workspace";
import type { AddWorkspaceFormData, UpdateAddWorkspaceField, WorkspaceDuplicateCandidate } from "./_lib/types";
import { getAddWorkspaceValidationMessage, isAddWorkspaceStepValid, totalAddWorkspaceSteps } from "./_lib/validation";

export default function AddWorkspacePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [duplicateCandidates, setDuplicateCandidates] = useState<WorkspaceDuplicateCandidate[]>([]);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [duplicateCheckError, setDuplicateCheckError] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

  const [formData, setFormData] = useState<AddWorkspaceFormData>(defaultAddWorkspaceFormData);


  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/add-workspace');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const hasSearchableLocation = formData.name.trim().length >= 3 && formData.latitude !== null && formData.longitude !== null;
    if (!hasSearchableLocation) return;

    let cancelled = false;

    const timer = window.setTimeout(async () => {
      try {
        if (cancelled) return;
        setCheckingDuplicates(true);
        setDuplicateCheckError(null);
        const candidates = await findPotentialWorkspaceDuplicates(supabase, formData);
        if (!cancelled) setDuplicateCandidates(candidates);
      } catch (error) {
        console.error("Failed to check duplicate workspaces:", error);
        if (!cancelled) {
          setDuplicateCandidates([]);
          setDuplicateCheckError("Could not check for duplicate places right now.");
        }
      } finally {
        if (!cancelled) setCheckingDuplicates(false);
      }
    }, 500);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [formData, supabase]);


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
      alert("Please find the workspace location so we can save its coordinates.");
      return;
    }

    setSubmitting(true);
    try {
      const { citySlug } = await submitWorkspace(supabase, formData, uploadedPhotos, user.id);
      await new Promise((resolve) => setTimeout(resolve, 500));
      router.push(`/profile/my-workspaces?submitted=1&city=${citySlug}`);
    } catch (error) {
      console.error("Error submitting workspace:", error);
      alert("Failed to submit workspace. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const updateField: UpdateAddWorkspaceField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const removeUploadedPhoto = async (index: number) => {
    const photoUrl = uploadedPhotos[index];
    if (!photoUrl || !user) return;

    setUploadedPhotos((prev) => prev.filter((_, photoIndex) => photoIndex !== index));
    const result = await deleteWorkspaceImage(photoUrl, user.id);

    if (!result.success) {
      console.error("Failed to delete removed upload:", result.error);
      alert("The photo was removed from the form, but we could not delete the uploaded file. Please try again or contact support.");
    }
  };

  const canProceedToNext = isAddWorkspaceStepValid(currentStep, formData, uploadedPhotos);
  const canSubmit = Boolean(formData.name && formData.latitude !== null && formData.longitude !== null && uploadedPhotos.length > 0);
  const validationMessage =
    !canProceedToNext && currentStep < totalAddWorkspaceSteps ? getAddWorkspaceValidationMessage(currentStep, formData) : null;
  const canCheckDuplicates = formData.name.trim().length >= 3 && formData.latitude !== null && formData.longitude !== null;

  return (
    <div className="min-h-full bg-background">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Add a Workspace</h1>
          <p className="text-muted-foreground">
            Share a great cafe or coworking space with the community
          </p>
        </div>

        <ProgressSteps currentStep={currentStep} totalSteps={totalAddWorkspaceSteps} />

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
            onPhotoUploaded={(url) => setUploadedPhotos((prev) => [...prev, url])}
            onPhotoRemoved={removeUploadedPhoto}
          />
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
