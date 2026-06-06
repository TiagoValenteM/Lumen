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
    <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t border-border/35 bg-background/90 px-4 py-3 shadow-lg shadow-black/10 backdrop-blur-md dark:shadow-black/30 sm:static sm:mt-8 sm:border-t-0 sm:bg-transparent sm:px-0 sm:py-0 sm:shadow-none sm:backdrop-blur-none">
      <Button variant="outline" onClick={onPrevious} disabled={currentStep === 1 || submitting} className="min-w-0 flex-1 cursor-pointer sm:flex-none">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Previous
      </Button>

      {currentStep < totalSteps ? (
        <Button onClick={onNext} disabled={submitting || !canProceedToNext} className="min-w-0 flex-1 cursor-pointer sm:flex-none">
          Next
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      ) : (
        <Button onClick={onSubmit} disabled={submitting || !canSubmit} className="min-w-0 flex-1 cursor-pointer sm:flex-none">
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              Submit place
            </>
          )}
        </Button>
      )}
    </div>
  );
}
