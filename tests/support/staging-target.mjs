const productionHosts = new Set(["lumen-lime.vercel.app", "kcmksmoicpgjfbufliwd.supabase.co"]);

/** @param {string} appUrl @param {string} databaseUrl @param {string} confirmedDatabaseOrigin */
export function assertStagingTarget(appUrl, databaseUrl, confirmedDatabaseOrigin) {
  const targets = [new URL(appUrl), new URL(databaseUrl)];
  if (targets.some(({ hostname, protocol, username, password }) =>
    productionHosts.has(hostname.replace(/\.$/, "")) || !["https:", "http:"].includes(protocol) || username || password)) {
    throw new Error("Write-enabled browser tests refuse production or unsafe targets.");
  }
  if (confirmedDatabaseOrigin !== targets[1].origin) {
    throw new Error("Confirm the isolated Supabase origin with LUMEN_E2E_CONFIRM_DATABASE_ORIGIN.");
  }
}
