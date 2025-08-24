// app/api/chat/route.ts
import OpenAI from "openai";

// --- Runtime & CORS ---------------------------------------------------------
export const runtime = "nodejs";

// Set this in Vercel → Settings → Environment Variables (recommended):
// CORS_ALLOW_ORIGIN = https://vbyu-assistant.vercel.app  (or your custom domain)
// During testing you can set it to "*" but lock it down for production.
const ALLOW_ORIGIN = process.env.CORS_ALLOW_ORIGIN || "*";
const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": ALLOW_ORIGIN,
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Preflight for browsers
export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

// --- OpenAI client ----------------------------------------------------------
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // set in Vercel env
});

// --- Site map & system prompt ----------------------------------------------
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

// --- POST handler -----------------------------------------------------------
export async function POST(req: Request) {
  try {
    // Parse input safely
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }

    const message = ((body?.message ?? "") + "").slice(0, 4000); // hard cap
    const firstName = ((body?.firstName ?? "Visitor") + "").slice(0, 120);

    if (!process.env.OPENAI_API_KEY) {
      return json({ error: "Server missing OPENAI_API_KEY" }, 500);
    }

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
      {
        type: "function",
        function: { name: "contact_support", parameters: { type: "object", properties: {} } },
      },
      { type: "function", function: { name: "none", parameters: { type: "object", properties: {} } } },
    ] as const;

    // Call the model
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini", // stable, cost-effective
      temperature: 0.2,
      tools: tools as any,
      messages: [
        { role: "system", content: systemPrompt(firstName) },
        { role: "user", content: message },
      ],
    });

    const choice = completion.choices?.[0];
    const msg: any = choice?.message ?? {};

    // Default payload
    const payload: any = {
      roleName: `${firstName}2`,
      text: typeof msg.content === "string" ? msg.content : "",
      action: null as null | Record<string, any>,
    };

    // Handle first tool call
    const tc = msg.tool_calls?.[0];
    if (tc?.function?.name) {
      let args: any = {};
      try {
        args = tc.function.arguments ? JSON.parse(tc.function.arguments) : {};
      } catch {
        // ignore bad args
      }

      if (tc.function.name === "open_page") {
        const url = SITE_MAP[String(args.slug)] || "/";
        payload.action = { type: "open_page", url };
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
    // Clear, user-visible error for debugging
    const msg = (e?.message || "Unknown error").toString();
    return json({ error: msg }, 500);
  }
}

// --- tiny helper ------------------------------------------------------------
function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}
