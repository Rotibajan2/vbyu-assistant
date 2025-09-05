// app/page.tsx
import Script from "next/script";

export default function Home() {
  return (
    <main className="container">
      <h1 className="h1">VaultedByU Assistant</h1>
      <p className="subtle">Ask your twin about uploads, pages, or support.</p>

      <div id="twin-panel" className="panel">
        <label className="label">
          <span>First name</span>
          <input id="twin-firstname" className="input" defaultValue="Visitor" placeholder="Your first name" />
        </label>

        <div id="twin-log" className="log">
          <div className="row"><strong>System:</strong><span>Hi, I’m your twin. How can I help?</span></div>
        </div>

        <form id="twin-form" className="form">
          <input id="twin-input" className="input" placeholder="Type your question…" autoComplete="off" />
          <button id="twin-send" className="btn" type="submit">Send</button>
        </form>
      </div>

      {/* External script only; no inline JS */}
      <Script src="/vybu-chat.js" strategy="afterInteractive" />
    </main>
  );
}
