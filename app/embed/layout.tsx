// app/embed/layout.tsx
import Script from "next/script";

export const metadata = {
  title: "VaultedByU Assistant (Embed)",
  description: "Embeddable AI Twin widget",
};

export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Client script that wires the form to /api/chat */}
        <Script id="vbyu-client" src="/vbyu-chat-v2.js?v=13" strategy="beforeInteractive" />
        <style>{`
          :root { color-scheme: light; }
          html, body { margin: 0; padding: 0; background:#f8fafc; }
          .card {
            --radius: 14px;
            --border: 1px solid #e5e7eb;
            --shadow: 0 6px 16px rgba(2,6,23,0.06);
            max-width: 720px; margin: 16px auto; background:#fff;
            border: var(--border); border-radius: var(--radius); box-shadow: var(--shadow);
          }
          .card-header { padding: 14px 16px 6px; border-bottom: 1px solid #f1f5f9; }
          .title { margin: 0; font: 600 18px/1.2 system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; color:#0f172a; }
          .subtle { margin: 4px 0 0; color:#64748b; font: 400 13px/1.3 system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; }

          .card-body { padding: 12px 16px 0; }
          .label { display:block; font: 500 13px/1.2 system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; color:#334155; margin: 6px 0 6px; }
          .input { width:100%; padding:10px 12px; border:1px solid #cbd5e1; border-radius:10px; background:#fff; }
          .input:focus { outline: 2px solid #93c5fd; border-color:#93c5fd; }

          .log {
            margin-top:10px; height: 380px; overflow:auto; border:1px solid #e5e7eb;
            border-radius: 10px; padding: 10px; background:#fafafa;
            font: 400 14px/1.45 ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
          }
          .row { display:flex; gap:8px; margin:8px 0; }
          .row strong { color:#0f172a; }
          .bubble {
            display:inline-block; padding:8px 10px; border-radius: 12px; max-width: 85%;
            background:#ffffff; border:1px solid #e5e7eb;
          }
          .me .bubble { background:#e8f0ff; border-color:#c7dcff; }
          .system .bubble { background:#fff7ed; border-color:#fde68a; }

          .card-footer { padding: 12px 16px 16px; }
          .form { display:flex; gap:10px; flex-wrap:wrap; }
          .msg { flex:1 1 320px; min-width: 220px; padding:10px 12px; border:1px solid #cbd5e1; border-radius:10px; }
          .btn {
            padding:10px 14px; background:#2563eb; color:#fff; border:0; border-radius:10px;
            font-weight:600; cursor:pointer;
          }
          .btn:disabled { opacity:.6; cursor:not-allowed; }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
