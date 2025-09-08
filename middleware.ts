// middleware.ts
import { NextRequest, NextResponse } from "next/server";

export const config = {
  matcher: ["/chat.js", "/vybu-chat.js", "/vbyu-chat.js", "/vbyu-chat-v2.js"],
};

export default function middleware(req: NextRequest) {
  const url = new URL("/scripts/vbyu-chat-v2", req.url);
  return NextResponse.rewrite(url);
}
