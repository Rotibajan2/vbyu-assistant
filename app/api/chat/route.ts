// app/api/chat/route.ts
import { NextRequest } from "next/server";

/** JSON helper with CORS */
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

/* ---------- Site page map ---------- */

type SitePage = {
  id: string;
  title: string;
  url: string;          // relative or absolute
  keywords: string[];   // synonyms / phrases
  description?: string;
};

const PAGES: SitePage[] = [
  { id: "home", title: "Home", url: "/", keywords: ["home","homepage","start","main","root","index"] },
  { id: "end-users", title: "End Users", url: "/end-users", keywords: ["end users","users","user portal","getting started"] },
  { id: "business-portal", title: "Business Portal", url: "/business-portal", keywords: ["business portal","business","admin","company","dashboard","org portal"] },
  { id: "my-vault", title: "My Vault", url: "/my-vault", keywords: ["my vault","vault","secure vault","documents","files","uploads","storage"] },
  { id: "ai-twin-input", title: "AI Twin Input", url: "/ai-twin-input", keywords: ["ai twin input","ai twin","assistant input","chat input","ask ai"] },
  {
    id: "license-manager",
    title: "License Manager",
    url: "/license-manager",
    keywords: ["license","licenses","licence","licensing","license manager","seat","seats","assign license","subscription","keys"],
    description: "View, assign, and revoke seats/licenses."
  },
  {
    id: "legacy-locker",
    title: "Legacy Locker",
    url: "/legacy-locker",
    keywords: ["legacy locker","legacy","locker","inheritance","estate","beneficiary","lecacy locker","lecacy","legasy"]
  },
  { id: "about", title: "About", url: "/about", keywords: ["about","about us","company","who we are","mission"] },
];

/* ---------- Matching helpers ---------- */

const norm = (s: string) => (s || "").toLowerCase().replace(/\s+/g, " ").trim();

function editDistance(a: string, b: string) {
  a = a.toLowerCase(); b = b.toLowerCase();
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[a.length][b.length];
}

function hasLinkIntent(t: string) {
  const intents = [
    "link","send me the link","open","go to","take me to","connect me to",
    "navigate","show me","where is","how do i get to","bring me to","direct me to"
  ];
  const s = norm(t);
  return intents.some(k => s.includes(k));
}

function findBestPage(userText: string): SitePage | null {
  const text = norm(userText);

  // direct title hit
  for (const p of PAGES) {
    if (text.includes(norm(p.title))) return p;
  }

  // keyword score + fuzzy tolerance
  let best: { page: SitePage; score: number } | null = null;
  for (const p of PAGES) {
    let score = 0;

    for (const kw of p.keywords) {
      const k = norm(kw);
      if (!k) continue;

      if (text.includes(k)) score += 2;

      const toks = text.split(/[^a-z0-9]+/).filter(Boolean);
      const kwToks = k.split(" ").filter(Boolean);

      outer: for (const tt of toks) {
        for (const kk of kwToks) {
          const dist = editDistance(tt, kk);
          if ((kk.length <= 5 && dist <= 1) || (kk.length <= 8 && dist <= 2) || dist <= 3) {
            score += 1;
            break outer;
          }
        }
      }

      for (const word of p.title.split(/\s+/)) {
        if (word.length > 3 && text.includes(word.toLowerCase())) score += 0.5;
      }
    }

    if (!best || score > best.score) best = { page: p, score };
  }

  return best && best.score >= 2 ? best.page : null;
}

function maybeStripToPageName(s: string) {
  const t = norm(s);
  return t
    .replace(/^can you (send|give|show) me (the )?link( to)? /, "")
    .replace(/^can you (open|go to|navigate to|take me to|connect me to) /, "")
    .replace(/^(open|go to|navigate to|take me to|connect me to) /, "")
    .replace(/^(the )/, "")
    .trim();
}

/* ---------- Chat handler ---------- */

export async function POST(req: NextRequest) {
  const { firstName = "Visitor", message = "", hintPageId = "" } = await req.json().catch(() => ({}));
  if (!message?.trim()) return json({ error: "Message is required." }, 400);

  // Try page routing first — deterministic and site-native
  const hinted = PAGES.find(p => p.id === hintPageId);
  const hasIntent = hasLinkIntent(message);
  const matched =
    (hasIntent && (findBestPage(message) || findBestPage(maybeStripToPageName(message)) || hinted)) ||
    findBestPage(message) ||
    null;

  if (matched) {
    return json({
      roleName: "VaultedByU",
      text: `Here you go — I’ve got the ${matched.title} for you.`,
      action: { type: "open_page", url: matched.url, pageId: matched.id },
    });
  }

  // Mock mode: keep your current behavior
  if (process.env.VBYU_MOCK === "1") {
    return json({
      roleName: "VaultedByU",
      text: `Mock reply: I received "${message}". (Turn off mock by unsetting VBYU_MOCK.)`,
    });
  }

  // Fall back to OpenAI for general Q&A, but with an on-brand system prompt
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
        content: [
          "You are the official VaultedByU site assistant. Be concise, polite, and friendly.",
          "Prefer internal navigation: if the user requests a known page, respond briefly and include {action:{type:'open_page',url:'/<page>'}}.",
          "Address the user by name if provided (e.g., 'Stephen').",
          "Offer step-by-step guidance for on-site tasks (uploading files, managing licenses, etc.).",
          "If unsure which page fits, ask a brief clarifying question and suggest likely destinations.",
        ].join(" "),
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
