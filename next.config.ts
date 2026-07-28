import type { NextConfig } from "next";

/**
 * CYMT STORE — Next.js configuration
 * - Optimized image delivery (AVIF / WebP, lazy by default via next/image)
 * - Lean bundle (modular icon + component imports)
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
 images: {
  formats: ["image/avif", "image/webp"],
  minimumCacheTTL: 60 * 60 * 24 * 30,

  remotePatterns: [
    {
      protocol: "https",
      hostname: "agkjlvkcmjzdzbttpsad.supabase.co",
      pathname: "/storage/v1/object/public/**",
    },
  ],
},
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
};

export default nextConfig;
