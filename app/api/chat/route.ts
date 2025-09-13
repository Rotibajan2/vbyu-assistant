// app/api/chat/route.ts
import { NextRequest } from "next/server";

const json = (data: any, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });

export async function OPTIONS() { return json({ ok: true }); }
export async function GET()     { return json({ ok: true, endpoint: "/api/chat" }); }

export async function POST(req: NextRequest) {
  const { firstName = "Visitor", message = "" } = await req.json().catch(() => ({}));
  if (!message?.trim()) return json({ error: "Message is required." }, 400);

  // Mock mode to avoid OpenAI during testing: set VBYU_MOCK=1
  if (process.env.VBYU_MOCK === "1") {
    return json({
      roleName: "VaultedByU",
      text: `Mock reply for ${firstName}: I received “${message}”. (Unset VBYU_MOCK to use live AI.)`,
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return json({
      roleName: "VaultedByU",
      text: "The AI key isn't configured yet. Please try again soon.",
    });
  }

  // --- Site awareness (you can expand this list anytime) ---
  const SITE_ORIGIN = process.env.VBYU_SITE_ORIGIN || "https://www.vaultedbyu.com";
  const sitePages = [
    { name: "Home",            path: "/" },
    { name: "End Users",       path: "/end-users" },
    { name: "Business Portal", path: "/business-portal" },
    { name: "My Vault",        path: "/my-vault" },
    { name: "AI Twin Input",   path: "/ai-twin-input" },
    { name: "License Manager", path: "/license-manager" },
    { name: "Legacy Locker",   path: "/legacy-locker" },
    { name: "About",           path: "/about" },
  ].map(p => ({ ...p, url: new URL(p.path, SITE_ORIGIN).toString() }));

  // --- Persona & tone: warmer, more human-like, small-talk savvy ---
  const systemPrompt = `
You are "VaultedByU", the friendly on-site assistant for ${SITE_ORIGIN}.
Primary goals:
1) Be warm, natural, concise. Greet and address the user by name when provided (e.g., "${firstName}").
2) Handle small talk like a human: acknowledge, mirror the user's mood briefly (1 sentence), then pivot to help.
3) For site questions, offer helpful pointers and links using short, friendly phrasing.
4) Use HTML anchors for links: <a href="ABSOLUTE_URL">Label</a>. Prefer absolute URLs to ${SITE_ORIGIN}.
5) If the user explicitly asks for a page or link, provide the link immediately in your reply. Keep extra commentary minimal.
6) When suggesting actions, ask a quick, optional follow-up ("Want me to open that for you?") but DON'T rely on it; still include the link.
7) Keep responses tight (1–4 sentences unless the user requests depth). Use bullet points sparingly.

Small-talk guidelines:
- If asked "How are you?" or similar, respond like a friendly human (1 sentence), optionally reflect the time of day, then offer help:
  e.g., "I'm doing great—thanks for asking! How can I help today?" or
       "Hanging in there! What would you like to do next?"
- Light warmth and positivity; avoid over-sharing, medical/diagnostic language, or pretending to have real feelings.

Site knowledge:
${sitePages.map(p => `- ${p.name}: ${p.url}`).join("\n")}

Link formatting:
- Always output links as HTML anchors with absolute URLs, like:
  <a href="${SITE_ORIGIN}/license-manager">License Manager</a>
- If user mentions a page by name, use the matching page link above.
- If the page isn't listed, provide a best guess under ${SITE_ORIGIN} using a sensible path label.

Personalization:
- Use the provided user name "${firstName}" naturally in greeting/closing when helpful.
- Do not overuse the name—once up front is enough unless the user uses your name again.
`.trim();

  // A tiny few-shot to steer "how are you" into human-like replies.
  const fewShot: Array<{ role: "user" | "assistant"; content: string }> = [
    {
      role: "user",
      content: "how are you doing today?"
    },
    {
      role: "assistant",
      content:
        "I'm doing well—thanks for asking! What would you like to work on today?"
    },
    {
      role: "user",
      content: "hi"
    },
    {
      role: "assistant",
      content:
        "Hi there! How can I help you today?"
    }
  ];

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const messages = [
    { role: "system", content: systemPrompt },
    ...fewShot,
    { role: "user", content: `User "${firstName}" says: ${message}` },
  ];

  const payload = {
    model,
    messages,
    temperature: 0.5, // slightly higher to feel more natural
  };

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const raw = await r.text();
  let data: any = {}; try { data = JSON.parse(raw); } catch {}

  if (!r.ok) {
    const msg = data?.error?.message || raw || "Upstream error";
    if (r.status === 429) {
      return json({
        roleName: "VaultedByU",
        text: "Our AI quota is currently exhausted. Please try again later.",
      }, 200);
    }
    if (r.status === 401) {
      return json({
        roleName: "VaultedByU",
        text: "Invalid API key. Please check OPENAI_API_KEY in Vercel.",
      }, 200);
    }
    return json({ error: msg }, r.status || 502);
  }

  const text = data?.choices?.[0]?.message?.content?.trim?.() || "(no reply text)";
  return json({ roleName: "VaultedByU", text }, 200);
}
