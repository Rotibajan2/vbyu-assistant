// app/page.tsx
export default function Home() {
  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="text-2xl font-semibold">I'm Your Assistant</h1>
      <p className="text-sm text-gray-600 mt-1">Ask your me about uploads, pages, or support.</p>

      <div className="mt-4">
        <label className="block text-sm mb-1" htmlFor="twin-firstname">Your name (optional)</label>
        <input id="twin-firstname" className="w-full border rounded p-2" placeholder="Stephen" autoComplete="off" />
      </div>

      <div id="twin-log" className="mt-4 h-64 overflow-y-auto border rounded p-3 bg-white" aria-live="polite">
        <div className="row">
          <strong>System:</strong> <span>Hi, I’m your twin. How can I help?</span>
        </div>
      </div>

      <form id="twin-form" className="mt-4 flex gap-2" autoComplete="off">
        <input id="twin-input" className="flex-1 border rounded p-2" placeholder="Type a message…" autoComplete="off" />
        <button id="twin-send" type="submit" className="px-4 py-2 rounded bg-blue-600 text-white">Send</button>
      </form>
    </main>
  );
}
