import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use one hostname in the browser (localhost OR 127.0.0.1). Mixing them breaks dev chunks.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
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
