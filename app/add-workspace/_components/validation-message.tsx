"use client";

type ValidationMessageProps = {
  message: string | null;
};

export function ValidationMessage({ message }: ValidationMessageProps) {
  if (!message) return null;

  return (
    <div className="mt-6 rounded-xl border border-destructive/15 bg-destructive/10 p-4">
      <p className="text-sm text-destructive">{message}</p>
    </div>
  );
}
