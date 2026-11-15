"use client";

import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type FormNavigationProps = {
  currentStep: number;
  totalSteps: number;
  submitting: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onSubmit: () => void;
};

export function FormNavigation({
  currentStep,
  totalSteps,
  submitting,
  onPrevious,
  onNext,
  onSubmit,
}: FormNavigationProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t border-border/60 bg-background/95 px-4 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:static sm:border-t-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
      <Button variant="outline" onClick={onPrevious} disabled={currentStep === 1 || submitting} className="min-h-11 min-w-0 flex-1 sm:flex-none">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Previous
      </Button>

      {currentStep < totalSteps ? (
        <Button onClick={onNext} disabled={submitting} className="min-h-11 min-w-0 flex-1 sm:flex-none">
          Next
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      ) : (
        <Button onClick={onSubmit} disabled={submitting} className="min-h-11 min-w-0 flex-1 sm:flex-none">
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
