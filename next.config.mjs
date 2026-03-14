import("@opennextjs/cloudflare").then((mod) => mod.initOpenNextCloudflareForDev());

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
