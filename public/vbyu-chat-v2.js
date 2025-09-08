/* public/vbyu-chat-v2.js */
(() => {
  // --- bootstrap marker so we can verify execution from the console ---
  try {
    window.__VBYU_LOADED__ = "starting";
    console.info("[vbyu] bootstrap starting");
  } catch {}

  const API_URL = "/api/chat"; // same-origin
  const log = (...a) => console.info("[VaultedByU v2]", ...a);
  const $ = (s) => document.querySelector(s);

  // -------- helpers --------
  function addMsg(who, text) {
    const row = document.createElement("div");
    row.className = "row";
    row.innerHTML = `<strong>${who}:</strong> <span>${text}</span>`;
    const box = $("#twin-log");
    if (!box) return;
    box.appendChild(row);
    box.scrollTop = box.scrollHeight;
  }

  function setBusy(b) {
    const btn = $("#twin-send");
    const input = $("#twin-input");
    if (btn) {
      btn.disabled = b;
      btn.textContent = b ? "Sending…" : "Send";
    }
    if (input) input.disabled = b;
  }

  // quick console test you can call: window.twinPing()
  window.twinPing = async function twinPing() {
    log("ping POST →", API_URL);
    try {
      const r = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ firstName: "Tester", message: "ping" }),
      });
      const t = await r.text();
      log("ping status:", r.status, "body:", t);
    } catch (e) {
      console.error("[VaultedByU v2] ping error:", e);
    }
  };

  // -------- main submit handler --------
  async function sendMessage(ev) {
    ev?.preventDefault?.();

    const input = $("#twin-input");
    const nameEl = $("#twin-firstname");
    if (!input || !nameEl) {
      addMsg("System", "Chat inputs not found on page.");
      return;
    }

    const firstName = (nameEl.value || "").trim() || "Visitor";
    const message = (input.value || "").trim();
    if (!message) return;

    addMsg(`${firstName}2 (you)`, message);
    setBusy(true);

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ firstName, message }),
      });

      const raw = await res.text();
      let data = {};
      if (raw) {
        try { data = JSON.parse(raw); } catch {}
      }

      if (!res.ok) {
        addMsg("System", `Error ${res.status}: ${data.error || raw || "Request failed"}`);
        return;
      }

      const replyName = data.roleName || `${firstName}2`;
      const replyText =
        typeof data.text === "string" && data.text.trim()
          ? data.text
          : "(no reply text)";
      addMsg(replyName, replyText);

      if (data.action?.type === "open_page" && data.action.url) {
        const a = document.createElement("a");
        a.href = data.action.url;
        a.textContent = `Open ${data.action.url}`;
        a.target = "_self";
        const row = document.createElement("div");
        row.className = "row";
        row.append("Action: ", a);
        const box = $("#twin-log");
        if (box) box.appendChild(row);
      }
    } catch (err) {
      addMsg("System", `Network error: ${String(err)}`);
    } finally {
      setBusy(false);
      if (input) {
        input.value = "";
        input.focus();
      }
    }
  }

  // -------- safe wiring (waits for elements) --------
  function haveEls() {
    return (
      $("#twin-firstname") &&
      $("#twin-input") &&
      $("#twin-log") &&
      $("#twin-form") &&
      $("#twin-send")
    );
  }

  function wireNow() {
    if (window.__VBYU_WIRED__) return; // avoid double-binding
    window.__VBYU_WIRED__ = true;

    const ids = {
      firstname: !!$("#twin-firstname"),
      input: !!$("#twin-input"),
      log: !!$("#twin-log"),
      form: !!$("#twin-form"),
      btn: !!$("#twin-send"),
    };
    log("vbyu-chat-v2.js loaded; elements:", ids);

    const form = $("#twin-form");
    const btn = $("#twin-send");

    if (form) form.addEventListener("submit", sendMessage);
    if (btn) btn.addEventListener("click", sendMessage);

    try { window.__VBYU_LOADED__ = "executed"; } catch {}
  }

  function waitAndWire(attempt = 0) {
    if (haveEls()) {
      wireNow();
      return;
    }
    if (attempt > 60) { // ~3s at 50ms intervals
      console.warn("[VaultedByU v2] elements still not found after waiting");
      return;
    }
    setTimeout(() => waitAndWire(attempt + 1), 50);
  }

  if (document.readyState === "complete" || document.readyState === "interactive") {
    waitAndWire();
  } else {
    document.addEventListener("DOMContentLoaded", () => waitAndWire(), { once: true });
  }
})();
