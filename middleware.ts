// middleware.ts
import { NextRequest, NextResponse } from "next/server";

// Intercept ONLY the legacy filenames
export const config = {
  matcher: ["/chat.js", "/vybu-chat.js", "/vbyu-chat.js"],
};

export default function middleware(req: NextRequest) {
  // Always serve the new route-backed script
  const url = new URL("/vbyu-chat-v2.js", req.url);
  const res = NextResponse.rewrite(url);

  // Stop caching everywhere
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  res.headers.set("Pragma", "no-cache");
  return res;
}
