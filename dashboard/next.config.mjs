/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Włącz standalone mode dla Docker
  output: 'standalone',
  experimental: {
    useWasmBinary: true,
  },
}

export default nextConfig
