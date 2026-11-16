import type { NextConfig } from "next";
import { LEGACY_LISBON_SLUG, LISBON_SLUG } from "./lib/features/cities/lisbon";

const nextConfig: NextConfig = {
  async redirects() {
    return [{
      source: `/cities/${LEGACY_LISBON_SLUG}/:path*`,
      destination: `/cities/${LISBON_SLUG}/:path*`,
      permanent: true,
    }];
  },
  images: {
    remotePatterns: [
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
