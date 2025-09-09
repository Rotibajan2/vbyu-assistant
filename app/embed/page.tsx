// app/embed/page.tsx
import Script from "next/script";

export const metadata = {
  title: "VaultedByU Assistant (Embed)",
  description: "Embeddable AI Twin widget",
};

export default function Embed() {
  return (
    <html lang="en">
      <head>
        {/* Load only what this page needs */}
        <Script id="vbyu-client" src="/vbyu-chat-v2.js?v=13" strategy="beforeInteractive" />
        <style>{`
          :root { color-scheme: light; }
          body { margin: 0; font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; background:#fff; }
          .panel { max-width: 720px; margin: 0 auto; padding: 12px; }
          .label { display:block; margin: 8px 0 6px; font-size: 14px; color:#334155; }
          .input { width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:8px; }
          .btn { padding:8px 12px; border:0; background:#2563eb; color:#fff; border-radius:8px; cursor:pointer }
          .log { margin-top:8px; height:360px; overflow:auto; border:1px solid #e5e7eb; border-radius:8px; padding:8px; background:#fafafa }
          .row { margin:6px 0; }
          h1 { font-size:18px; margin:8px 0 0; }
          p.subtle { margin:4px 0 10px; color:#64748b; font-size:13px; }
          form { margin-top:8px; display:flex; gap:8px; }
          @media (max-width:560px){ form { flex-direction: column; } .btn{ width:100%; } }
        `}</style>
      </head>
      <body>
        <main className="panel">
          <h1>VaultedByU Assistant</h1>
          <p className="subtle">Ask your twin about uploads, pages, or support.</p>

          <label className="label" htmlFor="twin-firstname">Your name (optional)</label>
          <input id="twin-firstname" className="input" placeholder="Stephen" autoComplete="off" />

          <div id="twin-log" className="log" aria-live="polite">
            <div className="row">
              <strong>System:</strong> <span>Hi, I’m your twin. How can I help?</span>
            </div>
          </div>

          <form id="twin-form" autoComplete="off">
            <input id="twin-input" className="input" placeholder="Type a message…" autoComplete="off" />
            <button id="twin-send" type="submit" className="btn">Send</button>
          </form>
        </main>
      </body>
    </html>
  );
}
