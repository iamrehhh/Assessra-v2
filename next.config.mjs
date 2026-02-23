/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'assessra.onrender.com' },
    ],
  },
  // Allow ESLint warnings during migration phase
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;

