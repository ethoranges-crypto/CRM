import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["telegram", "gramjs"],
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
};

export default nextConfig;
