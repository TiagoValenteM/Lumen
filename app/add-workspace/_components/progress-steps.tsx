"use client";

import { Check } from "lucide-react";

type ProgressStepsProps = {
  currentStep: number;
  steps: string[];
};

export function ProgressSteps({ currentStep, steps }: ProgressStepsProps) {
  return (
    <div className="-mx-4 mb-6 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
      <div className="flex min-w-max items-center sm:min-w-0">
        {steps.map((label, index) => {
          const step = index + 1;
          return (
            <div key={label} className="flex min-w-[7rem] items-center sm:min-w-0 sm:flex-1">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-medium transition-colors ${
                  step < currentStep
                    ? "border-primary bg-primary text-primary-foreground"
                    : step === currentStep
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/40 text-muted-foreground"
                }`}
              >
                {step < currentStep ? <Check className="h-4 w-4" /> : step}
              </div>
              <div className="ml-2 hidden min-w-0 sm:block">
                <p className={`truncate text-xs font-medium ${step === currentStep ? "text-foreground" : "text-muted-foreground"}`}>
                  {label}
                </p>
              </div>
              {step < steps.length && <div className={`mx-3 h-px flex-1 ${step < currentStep ? "bg-primary" : "bg-border/50"}`} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
