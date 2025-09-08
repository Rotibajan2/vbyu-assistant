// next.config.mjs

/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== "production";

// Build a permissive (but safe) CSP for Next.js + your script
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  // Your server calls OpenAI:
  "connect-src 'self' https://api.openai.com",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "object-src 'none'",
  // IMPORTANT: allow inline bootstraps + eval in dev; DO NOT use 'strict-dynamic' here.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} blob: data:`,
  // Next injects some inline styles; allow them:
  "style-src 'self' 'unsafe-inline'",
  "frame-ancestors 'self'",
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

  async redirects() {
    return [];
  },
};

export default nextConfig;
