import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Phones on the same Wi-Fi reach the dev server through the laptop's LAN IP.
  allowedDevOrigins: ["*.local", "192.168.*.*", "10.*.*.*", "172.16.*.*"],
  serverExternalPackages: ["@prisma/client", "bcryptjs", "ioredis", "ws"],
  turbopack: { root: path.resolve(".") },
  // The floating dev badge would cover the mobile bottom tab bar.
  devIndicators: false,
};

export default nextConfig;
