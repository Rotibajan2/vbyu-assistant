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
  keywords: string[];   // synonyms / phrases (avoid generic words)
  description?: string;
};

const PAGES: SitePage[] = [
  { id: "home", title: "Home", url: "/", keywords: ["home","homepage","start","main page"] },
  { id: "end-users", title: "End Users", url: "/end-users", keywords: ["end users","user portal","users page"] },
  { id: "business-portal", title: "Business Portal", url: "/business-portal", keywords: ["business portal","company portal","org portal","admin portal"] },
  { id: "my-vault", title: "My Vault", url: "/my-vault", keywords: ["my vault","vault","secure vault","documents","files","uploads","storage"] },
  // IMPORTANT: keep these keywords specific; do NOT include plain "ai"
  { id: "ai-twin-input", title: "AI Twin Input", url: "/ai-twin-input", keywords: ["ai twin input","assistant input","twin input","chat input"] },
  {
    id: "license-manager",
    title: "License Manager",
    url: "/license-manager",
    keywords: ["license manager","license","licenses","licence","licensing","seat","seats","assign license","subscription","keys"],
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

// Phrases that imply navigation/link intent
function hasLinkIntent(t: string) {
  const s = norm(t);
  const patterns = [
    /(^| )link( |$)/, /send me the link/, /give me the link/, /open /, /go to /,
    /take me to /, /connect me to /, /navigate( to)? /, /show me /, /where is /,
    /how do i get to /, /^\/[a-z0-9\-]+$/ // explicit /slug
  ];
  return patterns.some(rx => rx.test(s));
}

// Greetings/small talk that should NEVER route
function isSmallTalk(t: string) {
  const s = norm(t);
  const small = [
    "how are you", "hello", "hi", "hey", "good morning", "good afternoon",
    "good evening", "what's up", "sup", "how's it going"
  ];
  return small.some(p => s.includes(p));
}

type MatchResult = { page: SitePage; score: number; hits: number; why: string[] } | null;

function findBestPageDetailed(userText: string): MatchResult {
  const text = norm(userText);
  if (!text) return null;

  // Direct title substring hit is a strong signal
  for (const p of PAGES) {
    if (text.includes(norm(p.title))) {
      return { page: p, score: 100, hits: 2, why: [`title "${p.title}" found`] };
    }
  }

  // Score by keyword hits + mild fuzzy
  let best: MatchResult = null;

  for (const p of PAGES) {
    let score = 0;
    let hits = 0;
    const why: string[] = [];

    // explicit /slug mention
    if (text.includes(p.url) || text.includes(p.url.replace(/^\//, ""))) {
      score += 3; hits += 1; why.push(`mentions "${p.url}"`);
    }

    for (const kw of p.keywords) {
      const k = norm(kw);
      if (!k) continue;

      if (text.includes(k)) { score += 2; hits += 1; why.push(`keyword "${k}"`); }

      const toks = text.split(/[^a-z0-9]+/).filter(Boolean);
      const kwToks = k.split(" ").filter(Boolean);

      outer: for (const tt of toks) {
        for (const kk of kwToks) {
          const dist = editDistance(tt, kk);
          if ((kk.length <= 5 && dist <= 1) || (kk.length <= 8 && dist <= 2) || dist <= 3) {
            score += 1; hits += 1; why.push(`fuzzy "${tt}"~"${kk}"`);
            break outer;
          }
        }
      }

      for (const word of p.title.split(/\s+/)) {
        if (word.length > 3 && text.includes(word.toLowerCase())) {
          score += 0.5; why.push(`title-word "${word}"`);
        }
      }
    }

    if (!best || score > best.score) best = { page: p, score, hits, why };
  }

  return best;
}

// Only accept strong matches without explicit link intent
function isStrongMatch(m: MatchResult) {
  if (!m) return false;
  if (m.score >= 100) return true;          // exact title
  if (m.hits >= 2 && m.score >= 3) return true; // at least two signals
  return false;
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

  const debugOn = process.env.VBYU_DEBUG === "1";
  const dbg: any = debugOn ? { stage: "start" } : undefined;

  // Respect small talk; never route these
  if (!isSmallTalk(message)) {
    const intent = hasLinkIntent(message);
    const hinted = PAGES.find(p => p.id === hintPageId) || null;
    const best = findBestPageDetailed(message);
    const strippedBest = intent ? findBestPageDetailed(maybeStripToPageName(message)) : null;

    if (debugOn) Object.assign(dbg, { intent, hinted: hinted?.id, best, strippedBest });

    // Route when:
    // - explicit link/navigation intent + some match, OR
    // - no explicit intent but the match is strong (title/slug or ≥2 hits)
    const pick = (intent && (strippedBest || best || (hinted && { page: hinted, score: 1, hits: 1, why: ["hint"] })))
              || (!intent && isStrongMatch(best) && best);

    if (pick && pick.page) {
      const out: any = {
        roleName: "VaultedByU",
        text: `Here you go — I’ve got the ${pick.page.title} for you.`,
        action: { type: "open_page", url: pick.page.url, pageId: pick.page.id },
      };
      if (debugOn) out._debug = dbg;
      return json(out);
    }
  }

  // Mock mode: keep your behavior
  if (process.env.VBYU_MOCK === "1") {
    const out: any = {
      roleName: "VaultedByU",
      text: `Mock reply: I received "${message}". (Turn off mock by unsetting VBYU_MOCK.)`,
    };
    if (debugOn) out._debug = { ...(dbg||{}), stage: "mock" };
    return json(out);
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
        content: [
          "You are the official VaultedByU site assistant. Be concise, polite, and friendly.",
          "Prefer internal navigation: if the user requests a known page, respond briefly and include {action:{type:'open_page',url:'/<page>'}}.",
          "Address the user by name if provided (e.g., 'Stephen').",
          "Offer step-by-step guidance for on-site tasks (uploads, managing licenses, etc.).",
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
      return json({ roleName: "VaultedByU", text: "Our AI quota is currently exhausted. Please try again later." }, 200);
    }
    if (r.status === 401) {
      return json({ roleName: "VaultedByU", text: "Invalid API key. Please check OPENAI_API_KEY in Vercel." }, 200);
    }
    return json({ error: msg }, r.status || 502);
  }

  const text = data?.choices?.[0]?.message?.content?.trim?.() || "(no reply text)";
  const out: any = { roleName: "VaultedByU", text };
  if (debugOn) out._debug = { ...(dbg||{}), stage: "ai" };
  return json(out);
}
