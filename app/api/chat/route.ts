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
  const payload = {
    model,
    messages: [
      { role: "system", content: "Be concise, helpful, and polite." },
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
