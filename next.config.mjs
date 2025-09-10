// next.config.mjs

/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== "production";

const scriptSrc = [
  "'self'",
  "'unsafe-inline'",
  isDev ? "'unsafe-eval'" : "",
  "blob:",
  "data:",
].filter(Boolean).join(" ");

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "connect-src 'self' https://api.openai.com",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "object-src 'none'",
  `script-src ${scriptSrc}`,
  "style-src 'self' 'unsafe-inline'",
  // 🔓 Allow embedding from Google Sites (editor + published + googleusercontent) and your domains
  "frame-ancestors 'self' https://sites.google.com https://www.sites.google.com https://*.googleusercontent.com https://*.google.com https://vaultedbyu.com https://www.vaultedbyu.com",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "same-origin" },
  // ⚠️ Do NOT add X-Frame-Options; it conflicts with frame-ancestors
];

const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
