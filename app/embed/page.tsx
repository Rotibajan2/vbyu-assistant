// app/embed/page.tsx
export default function Embed() {
  return (
    <div className="card" role="region" aria-label="VaultedByU Assistant">
      <header className="card-header">
        <h1 className="title">VaultedByU Assistant</h1>
        <p className="subtle">Ask your twin about uploads, pages, or support.</p>
      </header>

      <div className="card-body">
        <label className="label" htmlFor="twin-firstname">Your name (optional)</label>
        <input
          id="twin-firstname"
          className="input"
          placeholder="Stephen"
          autoComplete="off"
        />

        <div id="twin-log" className="log" aria-live="polite">
          <div className="row system">
            <strong>System:</strong>
            <span className="bubble">Hi, I’m your twin. How can I help?</span>
          </div>
        </div>
      </div>

      <footer className="card-footer">
        <form id="twin-form" className="form" autoComplete="off">
          <input
            id="twin-input"
            className="msg"
            placeholder="Type a message…"
            autoComplete="off"
          />
          <button id="twin-send" type="submit" className="btn">
            Send
          </button>
        </form>
      </footer>
    </div>
  );
}
