import { setupDevPlatform } from '@cloudflare/next-on-pages/next-dev';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use the setupDevPlatform for local development with Cloudflare resources
  webpack: (config, { dev }) => {
    if (dev) {
      setupDevPlatform();
    }
    return config;
  },
};

export default nextConfig;
