import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disk-backed webpack cache on Windows often goes stale (missing ./5611.js style chunks)
  // after interrupted dev servers or AV scanning .next. Memory avoids corrupt manifests.
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = { type: "memory" };
    }
    return config;
  },
};

export default nextConfig;
