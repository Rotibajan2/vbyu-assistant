// app/api/chat/route.ts
import OpenAI from "openai";

// If you want to lock it down, set this env var in Vercel to your site origin,
// e.g. https://vaultedbyu.com or https://<YOUR-APP>.vercel.app
const ALLOW_ORIGIN = process.env.CORS_ALLOW_ORIGIN || "*";
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": ALLOW_ORIGIN,
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Force Node runtime (OpenAI SDK requires Node, not Edge)
export const runtime = "nodejs";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SITE_MAP: Record<string, string> = {
  home: "/",
  uploads: "/uploads",
  "uploads/ids": "/uploads/ids",
  "uploads/photos": "/uploads/photos",
  "uploads/legal": "/uploads/legal",
  "uploads/medical": "/uploads/medical",
  faq: "/help/faq",
  support: "/support",
  privacy: "/legal/privacy"
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
`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const message = (body?.message ?? "").toString();
    const firstName = (body?.firstName ?? "Visitor").toString();

    const tools = [
      { type: "function", function: { name: "open_page", parameters: { type: "object", properties: { slug: { type: "string" } }, required: ["slug"] } } },
      { type: "function", function: { name: "show_upload_steps", parameters: { type: "object", properties: { category: { type: "string", enum: ["ids", "photos", "legal", "medical"] } }, required: ["category"] } } },
      { type: "function", function: { name: "contact_support", parameters: { type: "object", properties: {} } } },
      { type: "function", function: { name: "none", parameters: { type: "object", properties: {} } } }
    ] as const;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      tools: tools as any,
      messages: [
        { role: "system", content: systemPrompt(firstName) },
        { role: "user", content: message }
      ]
    });

    const choice = completion.choices[0];
    const msg: any = choice.message;

    let payload: any = {
      roleName: `${firstName}2`,
      text: msg.content ?? "",
      action: null
    };

    const tc = msg.tool_calls?.[0];
    if (tc?.function?.name) {
      const args = tc.function.arguments ? JSON.parse(tc.function.arguments) : {};
      if (tc.function.name === "open_page") {
        payload.action = { type: "open_page", url: SITE_MAP[args.slug] || "/" };
      } else if (tc.function.name === "show_upload_steps") {
        const steps: Record<string, string[]> = {
          ids: ["Go to Uploads ▸ Government ID", "Tap 'Upload File'", "Add front/back photo or PDF", "Press Save"],
          photos: ["Go to Uploads ▸ Photos", "Tap 'Upload'", "Select images/videos", "Add a short description", "Press Save"],
          legal: ["Go to Uploads ▸ Legal", "Tap 'Upload'", "Attach PDF (will/trust)", "Add tags: 'will', 'trust'", "Press Save"],
          medical: ["Go to Uploads ▸ Medical", "Tap 'Upload'", "Attach PDF/images", "Add provider/date", "Press Save"]
        };
        payload.action = { type: "show_upload_steps", category: args.category, steps: steps[args.category] || [] };
      } else if (tc.function.name === "contact_support") {
        payload.action = { type: "contact_support", url: SITE_MAP["support"] };
      }
    }

    return new Response(JSON.stringify(payload), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
