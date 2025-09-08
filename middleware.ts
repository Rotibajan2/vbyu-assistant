// middleware.ts
import { NextRequest, NextResponse } from "next/server";

export const config = {
  // Only match the legacy filenames
  matcher: ["/chat.js", "/vybu-chat.js", "/vbyu-chat.js"],
};

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // always serve the cache-busted script
  const target = "/vbyu-chat-v2.js";
  if (pathname === "/chat.js" || pathname === "/vybu-chat.js" || pathname === "/vbyu-chat.js") {
    const url = new URL(target, req.url);
    const res = NextResponse.rewrite(url);
    // stop any further caching
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
    res.headers.set("Pragma", "no-cache");
    return res;
  }
  return NextResponse.next();
}
