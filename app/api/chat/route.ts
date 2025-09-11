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

/* =========================
   PAGE MAP + MATCHER
   ========================= */

type SitePage = {
  id: string;
  title: string;
  url: string;          // relative or absolute
  keywords: string[];   // synonyms / phrases
  description?: string;
};

// TODO: If your real slugs differ, update each `url` below.
const PAGES: SitePage[] = [
  {
    id: "home",
    title: "Home",
    url: "/",
    keywords: ["home","homepage","start","main","root","index"]
  },
  {
    id: "end-users",
    title: "End Users",
    url: "/end-users",
    keywords: ["end users","users","user portal","user help","getting started"]
  },
  {
    id: "business-portal",
    title: "Business Portal",
    url: "/business-portal",
    keywords: ["business portal","business","admin","company","dashboard","org portal"]
  },
  {
    id: "my-vault",
    title: "My Vault",
    url: "/my-vault",
    keywords: ["my vault","vault","secure vault","documents","files","uploads","storage"]
  },
  {
    id: "ai-twin-input",
    title: "AI Twin Input",
    url: "/ai-twin-input",
    keywords: ["ai twin input","ai twin","assistant input","chat input","ask ai"]
  },
  {
    id: "license-manager",
    title: "License Manager",
    url: "/license-manager",
    keywords: [
      "license","licenses","licence","licensing","license manager",
      "seat","seats","assign license","subscription","manage license","keys"
    ],
    description: "View, assign, and revoke seats/licenses."
  },
  {
    id: "legacy-locker",
    title: "Legacy Locker",
    url: "/legacy-locker",
    keywords: [
      "legacy locker","legacy","locker","inheritance","estate","beneficiary",
      "lecacy locker","lecacy","legasy" // common typos
    ]
  },
  {
    id: "about",
    title: "About",
    url: "/about",
    keywords: ["about","about us","company","who we are","mission"]
  },
];

/** Basic normalization */
function norm(s: string) {
  return (s || "").toLowerCase().replace(/\s+/g, " ").trim();
}

/** Tiny Levenshtein distance (for small strings/typos) */
function editDistance(a: string, b: string) {
  a = a.toLowerCase(); b = b.toLowerCase();
  const dp = Array.from({ length: a.length + 1 }, () =>
    new Array(b.length + 1).fill(0)
  );
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[a.length][b.length];
}

/** Does text contain any of the intent words? */
function hasLinkIntent(t: string) {
  const intents = [
    "link", "send me the link", "open", "go to", "take me to", "connect me to",
    "navigate", "show me", "where is", "how do i get to"
  ];
  const s = norm(t);
  return intents.some(key => s.includes(key));
}

/** Find best page given user text (handles typos lightly) */
function findBestPage(userText: string): SitePage | null {
  const text = norm(userText);

  // direct title hit
  for (const p of PAGES) {
    if (text.includes(norm(p.title))) return p;
  }

  // keyword score + fuzzy tolerance on single words/phrases
  let best: { page: SitePage; score: number } | null = null;

  for (const p of PAGES) {
    let score = 0;

    for (const kw of p.keywords) {
      const k = norm(kw);
      if (!k) continue;

      // exact/substring boost
      if (text.includes(k)) score += 2;

      // fuzzy: split text into tokens, compare to keyword tokens
      const toks = text.split(/[^a-z0-9]+/).filter(Boolean);
      const kwToks = k.split(" ").filter(Boolean);

      // Compare each token loosely (edit distance <= 2 for short words; <= 3 for longer)
      outer: for (const tt of toks) {
        for (const kk of kwToks) {
          const dist = editDistance(tt, kk);
          if ((kk.length <= 5 && dist <= 1) || (kk.length <= 8 && dist <= 2) || dist <= 3) {
            score += 1;
            break outer;
          }
        }
      }

      // small bonus if any title word appears
      for (const word of p.title.split(/\s+/)) {
        if (word.length > 3 && text.includes(word.toLowerCase())) score += 0.5;
      }
    }

    if (!best || score > best.score) best = { page: p, score };
  }

  // Require minimum score to avoid random matches
  return best && best.score >= 2 ? best.page : null;
}

/* =========================
   CHAT HANDLER
   ========================= */

export async function POST(req: NextRequest) {
  const { firstName = "Visitor", message = "" } = await req.json().catch(() => ({}));
  if (!message?.trim()) return json({ error: "Message is required." }, 400);

  // Mock mode: keep behavior, but still route to pages if possible
  if (process.env.VBYU_MOCK === "1") {
    const matched = findBestPage(message);
    if (matched || hasLinkIntent(message)) {
      const page = matched ?? findBestPage(maybeStripToPageName(message));
      if (page) {
        return json({
          roleName: "VaultedByU",
          text: `Here you go — I’ve got the ${page.title} for you.`,
          action: { type: "open_page", url: page.url },
        });
      }
    }
    return json({
      roleName: "VaultedByU",
      text: `Mock reply: I received "${message}". (Turn off mock by unsetting VBYU_MOCK.)`,
    });
  }

  // Try deterministic page routing first (fast and reliable)
  if (hasLinkIntent(message)) {
    const intentMatch = findBestPage(message) ?? findBestPage(maybeStripToPageName(message));
    if (intentMatch) {
      return json({
        roleName: "VaultedByU",
        text: `Here you go — I’ve got the ${intentMatch.title} for you.`,
        action: { type: "open_page", url: intentMatch.url },
      });
    }
  } else {
    const matched = findBestPage(message);
    if (matched) {
      return json({
        roleName: "VaultedByU",
        text: `Here you go — I’ve got the ${matched.title} for you.`,
        action: { type: "open_page", url: matched.url },
      });
    }
  }

  // Fall back to OpenAI for general answers
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
          "Be concise, helpful, and polite. If the user requests or implies navigation to a known page, prefer replying with a short confirmation and include {action:{type:'open_page',url:'/<page>'}}. If unsure, ask a brief clarifying question."
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

/** Extract a probable page name from “send me the link to X” phrasing */
function maybeStripToPageName(s: string) {
  const t = norm(s);
  // crude patterns; helps when user says: "send me the link to legacy locker"
  return t
    .replace(/^can you (send|give|show) me (the )?link( to)? /, "")
    .replace(/^can you (open|go to|navigate to|take me to|connect me to) /, "")
    .replace(/^(open|go to|navigate to|take me to|connect me to) /, "")
    .replace(/^(the )/, "")
    .trim();
}
