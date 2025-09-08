// app/page.tsx
import Script from "next/script";

export default function Home() {
  return (
    <main className="container">
      <h1 className="h1">VaultedByU Assistant</h1>
      <p className="subtle">Ask your twin about uploads, pages, or support.</p>

      <div id="twin-panel" className="panel" role="region" aria-label="VaultedByU chat panel">
        <label className="label" htmlFor="twin-firstname">
          <span>First name</span>
          <input
            id="twin-firstname"
            className="input"
            defaultValue="Visitor"
            placeholder="Your first name"
            autoComplete="given-name"
          />
        </label>

        <div id="twin-log" className="log" aria-live="polite" aria-relevant="additions">
          <div className="row">
            <strong>System:</strong>
            <span>Hi, I’m your twin. How can I help?</span>
          </div>
        </div>

        <form id="twin-form" className="form" aria-label="Send a message to your twin">
          <input
            id="twin-input"
            className="input"
            placeholder="Type your question…"
            autoComplete="off"
            aria-label="Your message"
          />
          <button id="twin-send" className="btn" type="submit" aria-label="Send message">
            Send
          </button>
        </form>
      </div>

      {/* Loads and executes the external chat logic (no inline JS) */}
      <Script src="/vbyu-chat-v2.js?v=2" strategy="afterInteractive" />
    </main>
  );
}
