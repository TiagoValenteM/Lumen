import assert from "node:assert/strict";
import { test } from "node:test";
import { createLatestRequest } from "../lib/features/locations/latest-request.ts";
import { normalizeCountryName } from "../lib/features/locations/country-name.ts";
import { tryGeocodeProviders } from "../lib/features/locations/geocode-fallback.ts";
import { submitWorkspaceReview } from "../lib/features/workspaces/submit-review.ts";

test("Swiss country variants use one English label without changing other countries", () => {
  assert.equal(normalizeCountryName(" Schweiz / Suisse / Svizzera / Svizra "), "Switzerland");
  assert.equal(normalizeCountryName("sWITZERLAND"), "Switzerland");
  assert.equal(normalizeCountryName("", "ch"), "Switzerland");
  assert.equal(normalizeCountryName(" United States ", "us"), "United States");
  assert.equal(normalizeCountryName("France/Suisse"), "France/Suisse");
});

test("geocoding falls back after provider errors and checks each provider's quota", async () => {
  const events = [];
  const result = await tryGeocodeProviders([
    { provider: "geoapify", lookup: async () => { throw new Error("upstream 401"); } },
    { provider: "photon", lookup: async () => ({ results: ["Zürich"] }) },
  ], async (provider) => { events.push(provider); return null; }, (provider) => events.push(`failed:${provider}`));
  assert.deepEqual(events, ["geoapify", "failed:geoapify", "photon"]);
  assert.deepEqual(result, { kind: "success", data: { results: ["Zürich"] } });
});

test("geocoding does not bypass an authorization or quota rejection", async () => {
  const denied = new Response(null, { status: 429, headers: { "Retry-After": "60" } });
  const result = await tryGeocodeProviders([
    { provider: "geoapify", lookup: async () => { throw new Error("timeout"); } },
    { provider: "nominatim", lookup: async () => assert.fail("denied provider was called") },
  ], async (provider) => provider === "nominatim" ? denied : null, () => {});
  assert.deepEqual(result, { kind: "denied", response: denied });
});

test("a successful search with no matches does not spend fallback quota", async () => {
  const checked = [];
  const result = await tryGeocodeProviders([
    { provider: "geoapify", lookup: async () => ({ results: [] }) },
    { provider: "photon", lookup: async () => assert.fail("fallback was called") },
  ], async (provider) => { checked.push(provider); return null; }, () => assert.fail("provider failed"));
  assert.deepEqual(checked, ["geoapify"]);
  assert.deepEqual(result, { kind: "success", data: { results: [] } });
});

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
