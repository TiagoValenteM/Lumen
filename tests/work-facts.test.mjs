import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getAvailabilityLabel, getStayLimitLabel, getWorkFacts, isLaptopReadyWorkspace, isLongStayWorkspace,
} from "../lib/features/workspaces/work-facts.ts";
import { defaultAddWorkspaceFormData } from "../app/add-workspace/_lib/defaults.ts";
import { buildWorkspaceSubmissionPayload } from "../app/add-workspace/_lib/workspace-submission-mapper.ts";

test("the submission payload keeps unknown, no and zero distinct", () => {
  assert.deepEqual(getWorkFacts(buildWorkspaceSubmissionPayload(defaultAddWorkspaceFormData)), {
    has_wifi: null, has_power_outlets: null, laptop_friendly: null, time_limit_hours: null,
  });
  const payload = buildWorkspaceSubmissionPayload({
    ...defaultAddWorkspaceFormData, has_wifi: false, wifi_speed: "fast", time_limit_hours: 0,
  });
  assert.equal(payload.has_wifi, false);
  assert.equal(payload.wifi_speed, null);
  assert.equal(payload.time_limit_hours, 0);
  assert.equal(getAvailabilityLabel(null), "Unknown");
  assert.equal(getAvailabilityLabel(false), "Not available");
  assert.equal(getStayLimitLabel(0), "No limit reported");
});

test("discovery does not infer laptop permission or long stays from missing facts", () => {
  assert.equal(isLaptopReadyWorkspace({ has_wifi: true, has_power_outlets: true }), false);
  assert.equal(isLaptopReadyWorkspace({ has_wifi: true, has_power_outlets: true, laptop_friendly: false }), false);
  assert.equal(isLongStayWorkspace({ laptop_friendly: true, time_limit_hours: null }), false);
  assert.equal(isLongStayWorkspace({ laptop_friendly: true, time_limit_hours: 0 }), false);
  assert.equal(isLongStayWorkspace({ laptop_friendly: true, time_limit_hours: 3 }), true);
  assert.equal(isLongStayWorkspace({ laptop_friendly: true, time_limit_hours: 0, work_facts_checked_at: "2026-11-12" }), true);
});
