// app/layout.tsx

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VaultedByU Assistant",
  description: "Your site-only AI twin assistant",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
  <link rel="preload" href="/chat.js" as="script" />
</head>
      <body>{children}</body>
    </html>
  );
}
