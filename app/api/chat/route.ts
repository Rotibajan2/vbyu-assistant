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

/* ──────────────────────────────────────────────────────────────
   Site knowledge (edit URLs/titles/descriptions as you wish)
   ────────────────────────────────────────────────────────────── */

type SitePage = {
  id: string;
  title: string;
  url: string;          // relative or absolute; relative preferred (keeps users on site)
  description: string;  // 1–2 lines: purpose & typical tasks
  keywords: string[];   // optional synonyms to help the model
};

// Keep this list tight & accurate. The model will reference it in answers.
const PAGES: SitePage[] = [
  {
    id: "home",
    title: "Home",
    url: "/",
    description: "Start here. Overview of VaultedByU and quick links.",
    keywords: ["home","homepage","start","main page","index"]
  },
  {
    id: "end-users",
    title: "End Users",
    url: "/end-users",
    description: "Guides and entry point for individual users.",
    keywords: ["end users","user portal","getting started","individuals"]
  },
  {
    id: "business-portal",
    title: "Business Portal",
    url: "/business-portal",
    description: "Organization admin/portal access and resources.",
    keywords: ["business portal","company portal","org portal","admin portal","dashboard"]
  },
  {
    id: "my-vault",
    title: "My Vault",
    url: "/my-vault",
    description: "Secure vault: upload, store, and manage documents/files.",
    keywords: ["my vault","vault","secure vault","documents","files","uploads","storage"]
  },
  {
    id: "ai-twin-input",
    title: "AI Twin Input",
    url: "/ai-twin-input",
    description: "Ask your AI twin questions about the site and tasks.",
    keywords: ["ai twin input","assistant input","twin input","chat input"]
  },
  {
    id: "license-manager",
    title: "License Manager",
    url: "/license-manager",
    description: "Assign, view, and revoke seats/licenses; manage subscriptions.",
    keywords: ["license manager","licenses","licensing","seat","seats","subscription","keys"]
  },
  {
    id: "legacy-locker",
    title: "Legacy Locker",
    url: "/legacy-locker",
    description: "Plan for beneficiaries: store and manage legacy information securely.",
    keywords: ["legacy locker","legacy","locker","inheritance","estate","beneficiary","lecacy","legasy"]
  },
  {
    id: "about",
    title: "About",
    url: "/about",
    description: "About VaultedByU: mission, company information.",
    keywords: ["about","about us","company","who we are","mission"]
  },
];

// Turn the map into a short context block the model can “read”
function siteContext() {
  const lines = PAGES.map(p => `- ${p.title} (${p.url}) — ${p.description}`);
  return [
    "VaultedByU Site Map:",
    ...lines,
    "",
    "Rules:",
    "• Prefer internal links (use the URLs above).",
    "• If the user asks for a page or a link, provide the direct link and 1–3 next steps.",
    "• If ambiguous, ask a brief clarifying question and suggest the top 2–3 likely pages.",
    "• When the user’s name is provided, greet them by name.",
    "• Provide short, numbered steps for on-site tasks (e.g., upload docs, manage licenses).",
    "• Keep answers concise, friendly, and actionable.",
  ].join("\n");
}

/* ──────────────────────────────────────────────────────────────
   Chat handler (same flow as your working version)
   ────────────────────────────────────────────────────────────── */

export async function POST(req: NextRequest) {
  const { firstName = "Visitor", message = "" } = await req.json().catch(() => ({}));
  if (!message?.trim()) return json({ error: "Message is required." }, 400);

  // Mock mode: set VBYU_MOCK=1 in Vercel to bypass OpenAI temporarily
  if (process.env.VBYU_MOCK === "1") {
    return json({
      roleName: "VaultedByU",
      text: `Mock reply: I received "${message}". (Turn off mock by unsetting VBYU_MOCK.)`,
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return json({
      roleName: "VaultedByU",
      text: "The AI key isn't configured yet. Please try again soon.",
    });
  }

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  // 🔹 Only change: richer, site-aware system prompt
  const SYSTEM = [
    "You are the official VaultedByU site assistant.",
    "Be concise, helpful, and polite. Use the site map below to answer questions.",
    "When the user asks for a specific page or a link, reply with the exact internal URL and 1–3 helpful next steps.",
    "If unsure which page matches, ask a brief clarifying question and suggest likely pages with links.",
    "Greet the user by name if provided (e.g., 'Stephen').",
    "Provide short, step-by-step guidance for common tasks (uploading files, managing licenses, accessing the legacy locker, etc.).",
    "",
    siteContext(),
  ].join("\n");

  const payload = {
    model,
    messages: [
      { role: "system", content: SYSTEM },
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
