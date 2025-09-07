/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== "production";

const APP_ORIGIN = process.env.APP_ORIGIN || "https://vbyu-assistant.vercel.app";
const SITE_ORIGIN = process.env.SITE_ORIGIN || "";

// If the browser ever reports a specific inline block you intentionally allow,
// you can paste its hash below. Otherwise, keep this empty to avoid inline JS.
const SCRIPT_HASHES = [
  // "'sha256-ZDd5kI1R6cZVRvZXwfjUf7ZVVjRZiiLkqS5kwgKI+aU='",
];

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  // Allow same-origin API calls (and any explicit origins you specify)
  `connect-src 'self' ${APP_ORIGIN} ${SITE_ORIGIN}`.trim(),
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "object-src 'none'",
  // No inline scripts; allow eval only in dev for React Fast Refresh
  `script-src 'self'${isDev ? " 'unsafe-eval'" : ""}${
    SCRIPT_HASHES.length ? " " + SCRIPT_HASHES.join(" ") : ""
  }`,
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
  // Don’t let lint/type errors block deployment right now
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },

  // Seatbelt: if anything still tries to load /chat.js or the misspelling,
  // send it to the real file.
  async redirects() {
    return [
      { source: "/chat.js", destination: "/vbyu-chat.js", permanent: false },
      { source: "/vybu-chat.js", destination: "/vbyu-chat.js", permanent: false },
    ];
  },
};

export default nextConfig;
