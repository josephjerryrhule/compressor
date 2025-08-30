import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  distDir: 'out',
  images: {
    unoptimized: true,
  },
  // Set the base path for the application (important for static export)
  basePath: '',
};

export default nextConfig;
