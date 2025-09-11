// app/api/chat/route.ts
import { NextRequest } from "next/server";

/** Small helper for JSON responses with CORS */
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

/* =========================
   1) Page map + matcher
   ========================= */

type SitePage = {
  id: string;
  title: string;
  url: string;          // relative or absolute
  keywords: string[];   // synonyms users might type
  description?: string;
};

/** Add/adjust your site’s pages here */
const PAGES: SitePage[] = [
  {
    id: "license-manager",
    title: "License Manager",
    url: "/license-manager",
    keywords: [
      "license","licenses","licence","licensing","license manager",
      "seat","seats","assign license","subscription","manage license","keys"
    ],
    description: "View, assign, and revoke VaultedByU seats/licenses."
  },
  {
    id: "investors",
    title: "Investor Welcome",
    url: "/investors",
    keywords: ["investor","investors","invest","fund","funding","cap table","investor welcome"]
  },
  {
    id: "vault",
    title: "Secure Vault",
    url: "/vault",
    keywords: ["vault","secure storage","documents","files","upload","storage","file vault"]
  },
  {
    id: "support",
    title: "Help & Support",
    url: "/help",
    keywords: ["help","support","contact","faq","guide","documentation","customer service"]
  },
  // Add more as needed…
];

function norm(s: string) {
  return (s || "").toLowerCase();
}

/** Lightweight, robust page matcher */
function findBestPage(userText: string): SitePage | null {
  const text = norm(userText);

  // quick win: direct title substring
  for (const p of PAGES) {
    if (text.includes(norm(p.title))) return p;
  }

  // score by keyword hits + title word bonus
  let best: { page: SitePage; score: number } | null = null;
  for (const p of PAGES) {
    let score = 0;

    for (const k of p.keywords) {
      if (text.includes(norm(k))) score += 1;
    }

    for (const w of p.title.split(/\s+/)) {
      if (w.length > 3 && text.includes(norm(w))) score += 0.5;
    }

    if (!best || score > best.score) best = { page: p, score };
  }

  return best && best.score >= 1 ? best.page : null;
}

/* =========================
   2) Chat handler
   ========================= */

export async function POST(req: NextRequest) {
  const { firstName = "Visitor", message = "" } = await req.json().catch(() => ({}));
  if (!message?.trim()) return json({ error: "Message is required." }, 400);

  // Mock mode: set VBYU_MOCK=1 in Vercel to bypass OpenAI temporarily
  if (process.env.VBYU_MOCK === "1") {
    // Try page routing even in mock mode so links still work
    const matched = findBestPage(message);
    if (matched) {
      return json({
        roleName: "VaultedByU",
        text: `Here you go — I’ve got the ${matched.title} for you.`,
        action: { type: "open_page", url: matched.url },
      });
    }
    return json({
      roleName: "VaultedByU",
      text: `Mock reply: I received "${message}". (Turn off mock by unsetting VBYU_MOCK.)`,
    });
  }

  // Try deterministic page routing first (fast + reliable)
  const matched = findBestPage(message);
  if (matched) {
    return json({
      roleName: "VaultedByU",
      text: `Here you go — I’ve got the ${matched.title} for you.`,
      action: { type: "open_page", url: matched.url },
    });
  }

  // Fall back to OpenAI for general Q&A
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return json({
      roleName: "VaultedByU",
      text: "The AI key isn't configured yet. Please try again soon.",
    });
  }

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const payload = {
    model,
    messages: [
      {
        role: "system",
        content:
          "Be concise, helpful, and polite. If you are unsure, ask a brief clarifying question."
      },
      { role: "user", content: `User ${firstName} says: ${message}` },
    ],
    temperature: 0.2,
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
    // Friendly fallback on common errors:
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
