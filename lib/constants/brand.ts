export const BRAND_NAME = "Deskhaunt";
export const BRAND_DESCRIPTION = "Find a cafe, library, or coworking space to work from. Compare Wi-Fi, outlets, laptop policies, and stay limits.";
export const BRAND_SITE_URL = "https://lumen-lime.vercel.app";
export const BRAND_SUPPORT_EMAIL = "support@lumen.com";
export const BRAND_OPEN_GRAPH = {
  type: "website",
  siteName: BRAND_NAME,
  locale: "en_US",
  images: {
    url: "/brand/deskhaunt-share.png",
    width: 1200,
    height: 630,
    type: "image/png",
    alt: "Deskhaunt. Find a good spot to work.",
  },
} as const;

export function getSiteOrigin(env: Readonly<Record<string, string | undefined>>) {
  const deploymentUrl = (host?: string) => host ? `https://${host}` : undefined;
  const candidates = [
    env.VERCEL_ENV === "preview" ? deploymentUrl(env.VERCEL_URL) : undefined,
    env.NEXT_PUBLIC_SITE_URL,
    deploymentUrl(env.VERCEL_PROJECT_PRODUCTION_URL),
    BRAND_SITE_URL,
  ];
  for (const value of candidates) {
    if (!value) continue;
    try {
      const url = new URL(value);
      if ((url.protocol === "https:" || url.protocol === "http:") && !url.username && !url.password) return new URL(url.origin);
    } catch {
      // Ignore malformed environment values and try the next origin.
    }
  }
  return new URL(BRAND_SITE_URL);
}
