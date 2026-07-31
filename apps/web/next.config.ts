import type { NextConfig } from "next";

const manualAssetsUrl = process.env.MANUAL_ASSETS_CLOUDFRONT_URL?.trim();
let manualAssetsHost: string | undefined;

if (manualAssetsUrl) {
  try {
    manualAssetsHost = new URL(manualAssetsUrl).hostname;
  } catch {
    manualAssetsHost = undefined;
  }
}

const nextConfig: NextConfig = {
  transpilePackages: ["@doctornest/ui", "@doctornest/database"],
  images: manualAssetsHost
    ? {
        remotePatterns: [
          {
            protocol: "https",
            hostname: manualAssetsHost,
          },
        ],
      }
    : undefined,
};

export default nextConfig;
