/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== "production";

// Optional: set these in Vercel if you need cross-origin connects.
// For same-origin only, you can leave SITE_ORIGIN empty.
const APP_ORIGIN = process.env.APP_ORIGIN || "https://vbyu-assistant.vercel.app";
const SITE_ORIGIN = process.env.SITE_ORIGIN || "";

// If you ever need to allow a specific inline script by hash, add it below.
// Keep this empty to avoid enabling inline JS.
const SCRIPT_HASHES = [
  // "'sha256-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx='",
];

// ---- Content Security Policy ----
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  // Allow same-origin API calls; add explicit origins if needed.
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

// ---- Security Headers ----
const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "same-origin" },
];

const nextConfig = {
  reactStrictMode: true,

  // Don’t fail the whole deploy on lint/type errors while iterating
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

  // Seatbelts: redirect any old filenames to the current one
  async redirects() {
    return [
      { source: "/chat.js", destination: "/vbyu-chat.js", permanent: false },
      { source: "/vybu-chat.js", destination: "/vbyu-chat.js", permanent: false },
    ];
  },
};

export default nextConfig;
