// app/layout.tsx
import "./globals.css";
import Script from "next/script";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "VaultedByU Assistant",
  description: "Your site-only AI twin assistant",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* ✅ Load the chat client script globally before React hydrates */}
        <Script
          id="vbyu-client"
          src="/vbyu-chat-v2.js?v=13"
          strategy="beforeInteractive"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
