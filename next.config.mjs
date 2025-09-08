// next.config.mjs

/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== "production";

// Build the script-src line safely
const scriptSrc = `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} 'strict-dynamic'`;

// Full CSP
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  // add any extra origins you need to call in production:
  "connect-src 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "object-src 'none'",
  scriptSrc,                // ← our dynamic line
  "style-src 'self'",
  "frame-ancestors 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "same-origin" },
];

const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },

  // Keep redirects empty while stabilizing static paths
  async redirects() {
    return [];
  },
};

export default nextConfig;
