import assert from "node:assert/strict";
import { test } from "node:test";
import { getAiStatusPresentation, getWorkspaceStatusPresentation } from "../app/admin/workspaces/_lib/status-presentation.ts";

test("AI presentation distinguishes active work, ready suggestions, staged outcomes and failure", () => {
  const expected = {
    queued: "Queued", researching: "Researching", extracting: "Extracting", pending: "Running",
    ready_for_review: "Ready for review", completed: "Ready for review",
    failed: "Failed", dismissed: "Discarded", applied: "Applied",
  };
  for (const [status, label] of Object.entries(expected)) assert.equal(getAiStatusPresentation(status).label, label);
  assert.equal(getAiStatusPresentation(null).label, "Not run");
  assert.equal(getAiStatusPresentation("constructor").label, "Unknown status");
});

test("moderation status labels describe the saved state without changing the status values", () => {
  assert.equal(getWorkspaceStatusPresentation("approved").label, "Approved");
  assert.equal(getWorkspaceStatusPresentation("rejected").label, "Rejected");
  assert.equal(getWorkspaceStatusPresentation("under_review").label, "Needs fixes");
  assert.equal(getWorkspaceStatusPresentation(null).label, "Pending");
});
