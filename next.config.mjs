/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== "production";

const APP_ORIGIN = process.env.APP_ORIGIN || "https://vbyu-assistant.vercel.app";
const SITE_ORIGIN = process.env.SITE_ORIGIN || "";

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  `connect-src 'self' ${APP_ORIGIN} ${SITE_ORIGIN}`.trim(),
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "object-src 'none'",
  // 👇 Immediate fix: allow inline + eval (eval only in dev)
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} 'strict-dynamic'`,
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

  async redirects() {
    return [
      { source: "/chat.js", destination: "/vbyu-chat-v2.js", permanent: false },
      { source: "/vybu-chat.js", destination: "/vbyu-chat-v2.js", permanent: false },
      { source: "/vbyu-chat.js", destination: "/vbyu-chat-v2.js", permanent: false },
    ];
  },
};

export default nextConfig;
