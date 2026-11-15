"use client";

type ProgressStepsProps = {
  currentStep: number;
  steps: string[];
};

export function ProgressSteps({ currentStep, steps }: ProgressStepsProps) {
  return (
    <div id="add-place-progress" tabIndex={-1} className="keyboard-focus scroll-mt-20 space-y-2 rounded-sm">
      <p className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <span className="font-semibold">{steps[currentStep - 1]}</span>
        <span className="text-muted-foreground">Step {currentStep} of {steps.length}</span>
      </p>
      <ol aria-label="Submission progress" className="flex gap-1.5">
        {steps.map((label, index) => (
          <li key={label} aria-current={index + 1 === currentStep ? "step" : undefined}
            className={`h-1.5 flex-1 rounded-full ${index + 1 <= currentStep ? "bg-primary" : "bg-muted-foreground/25"}`}>
            <span className="sr-only">{label}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
