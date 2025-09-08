// app/api/chat/route.ts
import { NextRequest } from "next/server";

const ALLOW_ORIGIN = "*"; // tighten later to your domain

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": ALLOW_ORIGIN,
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export async function OPTIONS() {
  return json({ ok: true });
}

export async function GET() {
  return json({ ok: true, endpoint: "/api/chat" });
}

export async function POST(req: NextRequest) {
  try {
    const { firstName = "Visitor", message = "" } = await req.json().catch(() => ({}));
    if (!message?.trim()) return json({ error: "Message is required." }, 400);

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return json({ error: "Server is missing OPENAI_API_KEY." }, 500);

    // Call OpenAI (fetch to keep deps minimal)
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    const prompt = `You are VaultedByU's site-only assistant. User ${firstName} says: ${message}`;

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "Be concise, helpful, and polite." },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
      }),
    });

    const raw = await r.text();
    let data: any = {};
    try { data = JSON.parse(raw); } catch {}

    if (!r.ok) {
      // Map common errors
      const msg = data?.error?.message || raw || "Upstream error";
      const code = r.status === 429 ? 429 : r.status === 401 ? 401 : 502;
      return json({ error: msg }, code);
    }

    const text =
      data?.choices?.[0]?.message?.content?.trim?.() ||
      "(no reply text)";

    return json({ roleName: "VaultedByU", text });
  } catch (e: any) {
    return json({ error: `Server error: ${e?.message || String(e)}` }, 500);
  }
}
