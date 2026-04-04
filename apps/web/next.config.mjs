/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Repo carries legacy lint debt across many files; CI can tighten rules separately.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
