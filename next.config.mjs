/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'assessra.onrender.com' },
    ],
  },
  // Allow large textbook uploads (Next.js limits FormData to 4MB by default)
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
};

export default nextConfig;

