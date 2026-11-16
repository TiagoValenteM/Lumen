import assert from "node:assert/strict";
import { test } from "node:test";
import { authHref, getAuthReturnPath, workspaceReviewPath } from "../lib/features/auth/return-path.ts";
import { getResumableStep } from "../app/add-workspace/_lib/validation.ts";

test("auth returns only to the add-place and review flows", () => {
  const review = workspaceReviewPath("zürich", "coffee-shop");
  assert.equal(getAuthReturnPath(review), review);
  assert.equal(new URL(authHref("/login", review), "https://lumen.test").searchParams.get("redirect"), review);
  assert.equal(getAuthReturnPath("/add-workspace"), "/add-workspace");
  for (const path of [
    null, "//evil.example", "https://evil.example", "javascript:alert(1)", "/admin",
    "/cities/../admin#write-review", "/cities/%2e%2e/admin#write-review",
    "/cities/%2Fevil.example/coffee#write-review", "/cities/ny/coffee%5cadmin#write-review",
    "/cities/ny/coffee?x=1#write-review", "/cities/ny/%broken#write-review",
  ]) assert.equal(getAuthReturnPath(path), "/", String(path));
});

test("a submission draft resumes the last valid step without bypassing prerequisites", () => {
  const place = { name: "Cafe", type: "cafe", latitude: 0, longitude: 0, city_name: "City", country: "Country" };
  assert.equal(getResumableStep(undefined, place, []), 1);
  assert.equal(getResumableStep(4, place, []), 4);
  assert.equal(getResumableStep(6, place, []), 5);
  assert.equal(getResumableStep(6, place, ["photo"]), 6);
  assert.equal(getResumableStep(6, { ...place, latitude: null }, ["photo"]), 1);
});
