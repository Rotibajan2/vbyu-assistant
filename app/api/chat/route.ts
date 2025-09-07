// app/api/chat/route.ts
import OpenAI from "openai";

export const runtime = "nodejs";

/* ======================  CORS  ====================== */
const ALLOW_ORIGIN = process.env.CORS_ALLOW_ORIGIN || "*";
const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": ALLOW_ORIGIN,
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  // Preflight for browsers
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET() {
  // Friendly response for browser GET (prevents 405)
  return new Response(
    JSON.stringify({
      ok: true,
      message:
        "VaultedByU Assistant API is live. Use POST with JSON: { firstName, message }",
      example: {
        method: "POST",
        url: "/api/chat",
        body: { firstName: "Stephen", message: "Where do I upload my ID?" },
      },
    }),
    { status: 200, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
  );
}

/* ======================  App logic  ====================== */
const SITE_MAP: Record<string, string> = {
  home: "/",
  uploads: "/uploads",
  "uploads/ids": "/uploads/ids",
  "uploads/photos": "/uploads/photos",
  "uploads/legal": "/uploads/legal",
  "uploads/medical": "/uploads/medical",
  faq: "/help/faq",
  support: "/support",
  privacy: "/legal/privacy",
};

function systemPrompt(firstName: string) {
  return `
You are the user's personal twin assistant for VaultedByU.
ONLY help with VaultedByU: how the site works, where to upload, finding pages, and reaching support.
If off-topic, say you're site-only and offer relevant help.
Call tools when navigation/steps/support are needed instead of describing them.
Your name is "${firstName}2".
Use this sitemap strictly: ${JSON.stringify(SITE_MAP)}
Upload mapping: ID->uploads/ids, Photos->uploads/photos, Legal->uploads/legal, Medical->uploads/medical.
Tone: clear, concise, step-by-step. Ask at most one clarifying question if needed.
Always finish with a short CTA like "Want me to open that page for you?".
`.trim();
}

// Lazy client to avoid build-time crashes
function getOpenAIClient() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("Server missing OPENAI_API_KEY");
  return new OpenAI({ apiKey: key });
}

/* ======================  POST  ====================== */
export async function POST(req: Request) {
  try {
    // Parse input safely
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }

    const message = ((body?.message ?? "") + "").slice(0, 4000);
    const firstName = ((body?.firstName ?? "Visitor") + "").slice(0, 120);

    const client = getOpenAIClient();

    // Tool schema for function calling
    const tools = [
      {
        type: "function",
        function: {
          name: "open_page",
          parameters: {
            type: "object",
            properties: { slug: { type: "string" } },
            required: ["slug"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "show_upload_steps",
          parameters: {
            type: "object",
            properties: {
              category: { type: "string", enum: ["ids", "photos", "legal", "medical"] },
            },
            required: ["category"],
          },
        },
      },
      { type: "function", function: { name: "contact_support", parameters: { type: "object", properties: {} } } },
      { type: "function", function: { name: "none", parameters: { type: "object", properties: {} } } },
    ] as const;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      tools: tools as any,
      messages: [
        { role: "system", content: systemPrompt(firstName) },
        { role: "user", content: message },
      ],
    });

    const choice = completion.choices?.[0];
    const msg: any = choice?.message ?? {};

    // Compute a robust reply string (fallbacks handle tool-only responses)
    let replyText =
      typeof msg.content === "string" && msg.content.trim()
        ? msg.content.trim()
        : "";

    // Friendly fallbacks if the model returned only a tool call (no text)
    if (!replyText && Array.isArray(msg.tool_calls) && msg.tool_calls.length) {
      const tc = msg.tool_calls[0];
      if (tc?.function?.name === "open_page") {
        replyText = "I can open the page you need. Want me to take you there?";
      } else if (tc?.function?.name === "show_upload_steps") {
        replyText = "Here are the steps to upload. Want me to list them for your category?";
      } else if (tc?.function?.name === "contact_support") {
        replyText = "I can take you to support. Should I open the support page?";
      }
    }

    if (!replyText) {
      replyText =
        "I’m here — but I didn’t generate a reply. Could you try rephrasing or being a bit more specific?";
    }

    // Default payload
    const payload: any = {
      roleName: `${firstName}2`,
      text: replyText,
      action: null as null | Record<string, any>,
    };

    // Handle first tool call (if any)
    const tc = msg.tool_calls?.[0];
    if (tc?.function?.name) {
      let args: any = {};
      try {
        args = tc.function.arguments ? JSON.parse(tc.function.arguments) : {};
      } catch {}

      if (tc.function.name === "open_page") {
        payload.action = { type: "open_page", url: SITE_MAP[String(args.slug)] || "/" };
      }

      if (tc.function.name === "show_upload_steps") {
        const steps: Record<string, string[]> = {
          ids: [
            "Go to Uploads ▸ Government ID",
            "Tap 'Upload File'",
            "Add front/back photo or PDF",
            "Press Save",
          ],
          photos: [
            "Go to Uploads ▸ Photos",
            "Tap 'Upload'",
            "Select images/videos",
            "Add a short description",
            "Press Save",
          ],
          legal: [
            "Go to Uploads ▸ Legal",
            "Tap 'Upload'",
            "Attach PDF (will/trust)",
            "Add tags: 'will', 'trust'",
            "Press Save",
          ],
          medical: [
            "Go to Uploads ▸ Medical",
            "Tap 'Upload'",
            "Attach PDF/images",
            "Add provider/date",
            "Press Save",
          ],
        };
        const cat = String(args.category) as keyof typeof steps;
        payload.action = { type: "show_upload_steps", category: cat, steps: steps[cat] || [] };
      }

      if (tc.function.name === "contact_support") {
        payload.action = { type: "contact_support", url: SITE_MAP["support"] };
      }
    }

    return json(payload, 200);
  } catch (e: any) {
    return json({ error: (e?.message || "Unknown error").toString() }, 500);
  }
}

/* ======================  helper  ====================== */
function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}
