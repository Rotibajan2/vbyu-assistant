// app/api/chat/route.ts
import { NextRequest } from "next/server";

/* ---------- tiny helpers ---------- */
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

/* ---------- your site map (edit paths/titles as needed) ---------- */
const SITE_BASE = process.env.SITE_BASE_URL || "https://vaultedbyu.com";
const PAGES: Array<{ key: string; title: string; path: string; aliases: string[] }> = [
  { key: "home",            title: "Home",             path: "/",                 aliases: ["main", "homepage", "start"] },
  { key: "end-users",       title: "End Users",        path: "/end-users",        aliases: ["users", "members"] },
  { key: "business-portal", title: "Business Portal",  path: "/business-portal",  aliases: ["business", "portal", "partners"] },
  { key: "my-vault",        title: "My Vault",         path: "/my-vault",         aliases: ["vault", "profile", "account"] },
  { key: "ai-twin",         title: "AI Twin Input",    path: "/ai-twin-input",    aliases: ["ai", "assistant", "ai twin", "twin"] },
  { key: "license-manager", title: "License Manager",  path: "/license-manager",  aliases: ["licenses", "subscription", "billing"] },
  { key: "legacy-locker",   title: "Legacy Locker",    path: "/legacy-locker",    aliases: ["legacy", "locker", "estate"] },
  { key: "about",           title: "About",            path: "/about",            aliases: ["contact", "company", "info"] },
];

/* build context string the model sees */
function siteContext(): string {
  const lines = PAGES.map(
    p => `- ${p.title}: ${SITE_BASE}${p.path} (relative: ${p.path}; aliases: ${[p.key, ...p.aliases].join(", ")})`
  );
  return [
    "VAULTEDBYU SITE MAP (authoritative):",
    ...lines,
    "",
    "IMPORTANT LINK RULES:",
    "• Always output clickable HTML anchors like: <a href=\"/license-manager\">License Manager</a>",
    "• Prefer the RELATIVE URL shown in parentheses; do NOT use markdown.",
    "• Provide at most one primary link in the first sentence when appropriate, plus up to two helpful next steps.",
  ].join("\n");
}

/* try to detect which page the user meant (for action.url) */
function pickPageUrlFromText(t: string): string | null {
  const q = (t || "").toLowerCase();
  for (const p of PAGES) {
    if (q.includes(p.title.toLowerCase())) return p.path;
    if (q.includes(p.key)) return p.path;
    if (p.aliases.some(a => q.includes(a.toLowerCase()))) return p.path;
  }
  return null;
}

/* pull first <a href="..."> from HTML (if model complied) */
function extractFirstHref(html: string): string | null {
  const m = html.match(/<a\s+[^>]*href=["']([^"']+)["']/i);
  return m?.[1] || null;
}

/* ---------- main POST ---------- */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const firstName = (body?.firstName ?? "Visitor") as string;
  const message   = (body?.message ?? "") as string;

  if (!message?.trim()) return json({ error: "Message is required." }, 400);

  // Mock mode for testing (keeps everything else intact)
  if (process.env.VBYU_MOCK === "1") {
    const maybe = pickPageUrlFromText(message);
    return json({
      roleName: "VaultedByU",
      text: maybe
        ? `You can open it here: <a href="${maybe}">Open Page</a>.`
        : `Mock reply: I received “${message}”.`,
      action: maybe ? { type: "open_page", url: maybe } : undefined,
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return json({
      roleName: "VaultedByU",
      text: "The AI key isn't configured yet. Please try again soon.",
    });
  }

  const SYSTEM = [
    "You are the official VaultedByU site assistant.",
    "Be concise, helpful, and polite.",
    "You operate INSIDE the VaultedByU website chat.",
    "When the user asks for a page, route, or link, ALWAYS include a real clickable HTML anchor (<a href=\"/route\">Title</a>) to the best matching page from the site map below. Do NOT use markdown links.",
    "Prefer a relative URL (e.g., /license-manager).",
    "Offer up to 2 short next steps or tips when helpful.",
    siteContext(),
  ].join("\n");

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const payload = {
    model,
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: `User name: ${firstName}\n\nQuestion: ${message}` },
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

  const text: string =
    data?.choices?.[0]?.message?.content?.trim?.() || "(no reply text)";

  // Decide if we can add an action for your client to append a clickable link
  let actionUrl: string | null = null;

  // 1) If the model produced a proper <a href="...">, use it
  const href = extractFirstHref(text);
  if (href) {
    actionUrl = href;
  } else {
    // 2) Otherwise try to infer from the user's message
    const guessed = pickPageUrlFromText(message);
    if (guessed) actionUrl = guessed;
  }

  // Normalize to relative path for in-site navigation
  if (actionUrl && actionUrl.startsWith(SITE_BASE)) {
    actionUrl = actionUrl.substring(SITE_BASE.length) || "/";
  }

  return json({
    roleName: "VaultedByU",
    text,                                // contains real <a href="/..."> … </a> when the model follows instructions
    action: actionUrl ? { type: "open_page", url: actionUrl } : undefined, // your client already renders a clickable anchor for this
  }, 200);
}
