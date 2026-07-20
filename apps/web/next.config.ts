import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@doctornest/ui", "@doctornest/database"]
};

export default nextConfig;
