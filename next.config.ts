import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "telegram",
    "telegram/sessions",
    "telegram/tl",
    "gramjs",
  ],
};

export default nextConfig;
