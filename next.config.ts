import type { NextConfig } from "next";

/**
 * Security headers for every route. No script CSP (Next's inline bootstrap would need nonces);
 * what is set is the part that cannot break the app: no framing, no MIME sniffing, a strict
 * referrer, HTTPS pinned, and the microphone only for this origin (voice briefing and interview).
 */
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "microphone=(self), camera=(), geolocation=(), payment=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // NEXT_DEV_FS_CACHE=0 (used by the e2e server) skips Turbopack's on-disk dev cache: the Mac this
  // runs on is short on space and the cache grows past a gigabyte.
  experimental: { turbopackFileSystemCacheForDev: process.env.NEXT_DEV_FS_CACHE !== "0" },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    // The words people type for the legal pages, in each language.
    return [
      { source: "/privacy", destination: "/legal/privacy", permanent: true },
      { source: "/privacidade", destination: "/legal/privacy", permanent: true },
      { source: "/privacidad", destination: "/legal/privacy", permanent: true },
      { source: "/terms", destination: "/legal/terms", permanent: true },
      { source: "/termos", destination: "/legal/terms", permanent: true },
      { source: "/terminos", destination: "/legal/terms", permanent: true },
      { source: "/refunds", destination: "/legal/refunds", permanent: true },
      { source: "/reembolso", destination: "/legal/refunds", permanent: true },
      { source: "/cookies", destination: "/legal/cookies", permanent: true },
    ];
  },
};

export default nextConfig;
