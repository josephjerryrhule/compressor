import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  distDir: 'out',
  images: {
    unoptimized: true,
  },
  // Set the base path for the application (important for static export)
  basePath: '',
  // Specify trailingSlash to avoid path issues with static export
  trailingSlash: true,
  // Generate ETag headers for better caching
  generateEtags: true,
  // Increase memory limit through environment setting
  env: {
    NODE_OPTIONS: '--max-old-space-size=4096'
  },
};

export default nextConfig;
