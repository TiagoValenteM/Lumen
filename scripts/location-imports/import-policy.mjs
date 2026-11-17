const allowedStatuses = new Set(["pending", "under_review"]);

export function leadStatus(status = "pending") {
  if (!allowedStatuses.has(status)) throw new Error("Import status must be pending or under_review.");
  return status;
}

// A discovery lead is not evidence for public workability facts.
export function workspaceLeadRow(workspace, cityId, status) {
  const { name, slug, type, address, latitude, longitude, website, phone,
    location_source, location_provider, location_provider_id, location_confidence, location_raw, admin_notes } = workspace;
  return {
    name, slug, type, status: leadStatus(status ?? workspace.status), city_id: cityId,
    address, latitude, longitude, website, phone,
    has_wifi: null, has_power_outlets: null, laptop_friendly: null, time_limit_hours: null,
    location_source, location_provider, location_provider_id, location_confidence, location_raw, admin_notes,
  };
}

export function confirmImportTarget(configuredUrl, expectedOrigin) {
  if (!configuredUrl || !expectedOrigin) throw new Error("Write mode requires a Supabase URL and --target with that exact origin.");
  const configured = new URL(configuredUrl);
  const expected = new URL(expectedOrigin);
  if (!["http:", "https:"].includes(configured.protocol) || configured.origin !== expected.origin ||
      configured.username || configured.password || expectedOrigin !== expected.origin) {
    throw new Error("Import target does not match the configured database origin.");
  }
  return configured.origin;
}
