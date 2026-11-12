export type GeocodeProvider = "geoapify" | "locationiq" | "photon" | "nominatim";

export type GeocodeAttempt<T> = {
  provider: GeocodeProvider;
  lookup: () => Promise<T>;
};

export async function tryGeocodeProviders<T>(
  attempts: GeocodeAttempt<T>[],
  checkQuota: (provider: GeocodeProvider) => Promise<Response | null>,
  onFailure: (provider: GeocodeProvider) => void,
) {
  for (const { provider, lookup } of attempts) {
    const denied = await checkQuota(provider);
    if (denied) return { kind: "denied", response: denied } as const;
    try {
      return { kind: "success", data: await lookup() } as const;
    } catch {
      // Upstream errors may include a request URL containing a provider key.
      onFailure(provider);
    }
  }
  return { kind: "unavailable" } as const;
}
