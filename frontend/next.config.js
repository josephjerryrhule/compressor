/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable static export for Netlify deployment
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
  // Set the output file tracing root to avoid workspace detection issues
  outputFileTracingRoot: __dirname,
  // Environment variables
  env: {
    // Backend URL for production (will be set in Netlify)
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.mediacompressor.com'
  },
  // Skip API routes for static export
  skipTrailingSlashRedirect: true,
};

module.exports = nextConfig;
