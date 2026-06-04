"use client";

import { Check } from "lucide-react";

type ProgressStepsProps = {
  currentStep: number;
  totalSteps: number;
};

export function ProgressSteps({ currentStep, totalSteps }: ProgressStepsProps) {
  return (
    <div className="flex items-center justify-between mb-8">
      {Array.from({ length: totalSteps }, (_, index) => index + 1).map((step) => (
        <div key={step} className="flex items-center flex-1">
          <div
            className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
              step < currentStep
                ? "bg-primary border-primary text-primary-foreground"
                : step === currentStep
                  ? "border-primary text-primary"
                  : "border-muted text-muted-foreground"
            }`}
          >
            {step < currentStep ? <Check className="h-5 w-5" /> : step}
          </div>
          {step < totalSteps && <div className={`flex-1 h-0.5 mx-2 ${step < currentStep ? "bg-primary" : "bg-muted"}`} />}
        </div>
      ))}
    </div>
  );
}
