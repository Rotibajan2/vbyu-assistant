/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== "production";

const APP_ORIGIN = process.env.APP_ORIGIN || "https://vbyu-assistant.vercel.app";
const SITE_ORIGIN = process.env.SITE_ORIGIN || "";

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  `connect-src 'self' ${APP_ORIGIN} ${SITE_ORIGIN}`,
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "object-src 'none'",
  `script-src 'self'${isDev ? " 'unsafe-eval'" : ""}`, //no 'unsafe-inline'
  "style-src 'self'",                                  //no 'unsafe-inline'
  "frame-ancestors 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp }
];

const nextConfig = {
  // Don’t let lint/type errors block deployment right now
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
