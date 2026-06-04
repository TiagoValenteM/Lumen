"use client";

import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type FormNavigationProps = {
  currentStep: number;
  totalSteps: number;
  submitting: boolean;
  canProceedToNext: boolean;
  canSubmit: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onSubmit: () => void;
};

export function FormNavigation({
  currentStep,
  totalSteps,
  submitting,
  canProceedToNext,
  canSubmit,
  onPrevious,
  onNext,
  onSubmit,
}: FormNavigationProps) {
  return (
    <div className="flex items-center justify-between mt-8">
      <Button variant="outline" onClick={onPrevious} disabled={currentStep === 1 || submitting} className="cursor-pointer">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Previous
      </Button>

      {currentStep < totalSteps ? (
        <Button onClick={onNext} disabled={submitting || !canProceedToNext} className="cursor-pointer">
          Next
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      ) : (
        <Button onClick={onSubmit} disabled={submitting || !canSubmit} className="cursor-pointer">
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              Submit Workspace
            </>
          )}
        </Button>
      )}
    </div>
  );
}
