const aiStatuses = {
  none: { label: "Not run", detail: "No AI run yet.", tone: "neutral" },
  queued: { label: "Queued", detail: "Waiting for the analysis to start.", tone: "neutral" },
  researching: { label: "Researching", detail: "Looking for sources about this place.", tone: "attention" },
  extracting: { label: "Extracting", detail: "Turning research into field suggestions.", tone: "attention" },
  pending: { label: "Running", detail: "Analysis is in progress.", tone: "attention" },
  ready_for_review: { label: "Ready for review", detail: "Suggestions are ready to compare.", tone: "attention" },
  completed: { label: "Ready for review", detail: "Suggestions are ready to compare.", tone: "attention" },
  failed: { label: "Failed", detail: "The run did not finish. You can try again.", tone: "danger" },
  dismissed: { label: "Discarded", detail: "This run was discarded.", tone: "neutral" },
  applied: { label: "Applied", detail: "Suggestions from this run were saved.", tone: "neutral" },
} as const;

export function getAiStatusPresentation(status: string | null | undefined) {
  if (!status) return aiStatuses.none;
  return Object.hasOwn(aiStatuses, status)
    ? aiStatuses[status as keyof typeof aiStatuses]
    : { label: "Unknown status", detail: "The current AI status is unavailable.", tone: "neutral" as const };
}

export function getWorkspaceStatusPresentation(status: string | null | undefined) {
  if (status === "approved") return { label: "Approved", tone: "attention" } as const;
  if (status === "rejected") return { label: "Rejected", tone: "danger" } as const;
  if (status === "under_review") return { label: "Needs fixes", tone: "neutral" } as const;
  return { label: "Pending", tone: "neutral" } as const;
}
