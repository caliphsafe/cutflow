import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [],
  },
  experimental: {
    // Keep production builds stable on high-core CI machines such as Vercel.
    cpus: 4,
  },
};

export default nextConfig;
