// app/layout.tsx
import "./globals.css";
import Script from "next/script";

export const metadata = {
  title: "VaultedByU Assistant",
  description: "Your site-only AI twin assistant",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Ensure the client script loads before hydration */}
        <Script
          id="vbyu-client"
          src="/vbyu-chat-v2.js?v=10"
          strategy="beforeInteractive"
          onLoad={() => {
            // this runs when the browser confirms the script downloaded & executed
            // it’s inline but allowed by our current CSP with 'unsafe-inline'
            // (we can remove later once stable)
            // @ts-ignore
            window.__VBYU_LOADED__ = "executed";
            console.info("[vbyu] client script executed");
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
