import assert from "node:assert/strict";
import { test } from "node:test";
import { createLatestRequest } from "../lib/features/locations/latest-request.ts";
import { submitWorkspaceReview } from "../lib/features/workspaces/submit-review.ts";

test("an obsolete lookup cannot commit or clear the current lookup", async () => {
  const lookups = createLatestRequest();
  const results = [];
  const slow = Promise.withResolvers();
  const fast = Promise.withResolvers();
  const commit = async (response) => {
    const request = lookups.start();
    const result = await response;
    if (request.isCurrent()) results.push(result);
    return request.finish();
  };

  const old = commit(slow.promise);
  const current = commit(fast.promise);
  fast.resolve("latest selection");
  assert.equal(await current, true);
  slow.resolve("stale pin");
  assert.equal(await old, false);
  assert.deepEqual(results, ["latest selection"]);
});

test("clearing a selection aborts its lookup without marking it complete", () => {
  const lookups = createLatestRequest();
  const first = lookups.start();
  const current = lookups.start();
  assert.equal(first.signal.aborted, true);
  assert.equal(first.finish(), false);
  assert.equal(current.isCurrent(), true);
  lookups.cancel();
  assert.equal(current.signal.aborted, true);
  assert.equal(current.isCurrent(), false);
});

test("submitting a review writes only the review, never the profile", async () => {
  const calls = [];
  const supabase = {
    from(table) {
      assert.equal(table, "reviews");
      return { upsert: async (row, options) => { calls.push({ row, options }); return { error: null }; } };
    },
  };
  await submitWorkspaceReview(supabase, { workspaceId: "place", userId: "member", rating: 4, comment: "  Nice  " });
  assert.deepEqual(calls, [{
    row: { workspace_id: "place", user_id: "member", rating: 4, comment: "Nice" },
    options: { onConflict: "workspace_id,user_id" },
  }]);
});
