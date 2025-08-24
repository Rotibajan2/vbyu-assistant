import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Your deployed API origin (this app)
const APP_ORIGIN = process.env.APP_ORIGIN || "https://vbyu-assistant.vercel.app";

// If your chat widget runs on a different site (e.g., Google Sites / your main site),
// set SITE_ORIGIN in Vercel to that origin (e.g., https://www.vaultedbyu.com).
// Leave empty if the widget is on the same origin as this app.
const SITE_ORIGIN = process.env.SITE_ORIGIN || "";

// Build the Content Security Policy
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  // Allow API calls to your own app and (optionally) your external site
  `connect-src 'self' ${APP_ORIGIN} ${SITE_ORIGIN}`,
  // Images/fonts
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  // Lock down risky types
  "object-src 'none'",
  // Scripts: allow 'unsafe-eval' only in dev so Next.js/devtools can run
  `script-src 'self'${isDev ? " 'unsafe-eval'" : ""}`,
  // Styles often need 'unsafe-inline' for framework styles
  "style-src 'self' 'unsafe-inline'",
  // Don’t let other sites embed yours in iframes
  "frame-ancestors 'self'",
  // Upgrade any http links to https
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
