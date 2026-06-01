import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Next.js 16: serverExternalPackages is now top-level (moved from experimental)
  serverExternalPackages: ['pg', 'bcryptjs'],
  // Next.js 16: turbopack config is now top-level (moved from experimental)
  turbopack: {},
}

export default nextConfig
