import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.public.blob.vercel-storage.com' },
    ],
  },
  async redirects() {
    return [
      { source: '/ADMIN', destination: '/admin/dashboard', permanent: true },
      { source: '/Admin', destination: '/admin/dashboard', permanent: true },
      { source: '/ADMIN/:path*', destination: '/admin/:path*', permanent: true },
    ];
  },
};

export default nextConfig;
