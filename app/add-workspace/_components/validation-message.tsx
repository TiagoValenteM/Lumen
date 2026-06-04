"use client";

type ValidationMessageProps = {
  message: string | null;
};

export function ValidationMessage({ message }: ValidationMessageProps) {
  if (!message) return null;

  return (
    <div className="mt-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
      <p className="text-sm text-destructive">{message}</p>
    </div>
  );
}
