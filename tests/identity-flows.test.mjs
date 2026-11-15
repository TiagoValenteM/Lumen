import assert from "node:assert/strict";
import { test } from "node:test";
import { getAuthReturnPath } from "../lib/features/auth/return-path.ts";
import { getAddWorkspaceValidationIssue, isAddWorkspaceStepValid } from "../app/add-workspace/_lib/validation.ts";

test("sign-in resumes adding a place or writing a review, not arbitrary redirects", () => {
  const search = (redirect) => new URLSearchParams({ redirect }).toString();
  for (const path of ["/add-workspace", "/cities/zurich/cafe-malea#write-review"]) {
    assert.equal(getAuthReturnPath(search(path)), path);
  }
  for (const path of ["https://example.com", "//example.com", "/\\example.com", "/cities/../..#write-review", "/cities/%2e%2e/foo#write-review", "/admin", "/cities/zurich/cafe#other"]) {
    assert.equal(getAuthReturnPath(search(path)), "/");
  }
});

test("add-place feedback points to the first missing field and photos are still required", () => {
  const form = { name: "", type: "cafe", latitude: null, longitude: null, city_name: "", country: "" };
  assert.equal(getAddWorkspaceValidationIssue(1, form).field, "place-location");
  Object.assign(form, { latitude: 0, longitude: 0 });
  assert.equal(getAddWorkspaceValidationIssue(1, form).field, "name");
  form.name = "Cafe";
  assert.equal(getAddWorkspaceValidationIssue(1, form).field, "place-city");
  form.city_name = "Zurich";
  assert.equal(getAddWorkspaceValidationIssue(1, form).field, "place-country");
  form.country = "Switzerland";
  assert.equal(isAddWorkspaceStepValid(1, form, []), true);
  assert.equal(getAddWorkspaceValidationIssue(5, form).field, "place-photos");
  assert.equal(isAddWorkspaceStepValid(6, form, []), false);
  assert.equal(isAddWorkspaceStepValid(6, form, ["photo"]), true);
});
