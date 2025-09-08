// app/layout.tsx
import "./globals.css";
import Script from "next/script";

export const metadata = {
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
        {/* Load your client script before hydration so window.twinPing exists */}
        <Script
          id="vbyu-client"
          src="/vbyu-chat-v2.js?v=10"
          strategy="beforeInteractive"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
