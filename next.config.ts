import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow other devices on the home network to load the dev server
  // (Next blocks cross-origin requests to dev assets by default).
  allowedDevOrigins: ["192.168.50.96", "*.local", "192.168.50.*"],
};

export default nextConfig;
