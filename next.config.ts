import type { NextConfig } from "next";
import { LEGACY_LISBON_SLUG, LISBON_SLUG } from "./lib/features/cities/lisbon";

const localStaging = process.env.LUMEN_E2E_ALLOW_WRITES === "staging" &&
  process.env.NEXT_PUBLIC_SUPABASE_URL === "http://127.0.0.1:54321";

const nextConfig: NextConfig = {
  async redirects() {
    return [{
      source: `/cities/${LEGACY_LISBON_SLUG}/:path*`,
      destination: `/cities/${LISBON_SLUG}/:path*`,
      permanent: true,
    }];
  },
  images: {
    dangerouslyAllowLocalIP: localStaging,
    remotePatterns: [
      ...(localStaging ? [new URL("http://127.0.0.1:54321/storage/v1/object/public/workspace-photos/**")] : []),
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
      },
    ],
  },
};

export default nextConfig;
