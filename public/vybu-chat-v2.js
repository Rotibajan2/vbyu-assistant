// public/vbyu-chat.js
(() => {
  const API_URL = "/api/chat"; // same origin; simpler
  const log = (...a) => console.info("[VaultedByU]", ...a);

  // expose a quick test in console: window.twinPing()
  window.twinPing = async function twinPing() {
    log("ping POST →", API_URL);
    try {
      const r = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName: "Tester", message: "ping" }),
      });
      const t = await r.text();
      log("ping status:", r.status, "body:", t);
    } catch (e) {
      console.error("[VaultedByU] ping error:", e);
    }
  };

  function $(s) { return document.querySelector(s); }
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
    if (btn) btn.disabled = b;
    if (btn) btn.textContent = b ? "Sending…" : "Send";
    if (input) input.disabled = b;
  }

  async function sendMessage(ev) {
    ev?.preventDefault?.();
    const input = $("#twin-input");
    const nameEl = $("#twin-firstname");
    if (!input || !nameEl) {
      addMsg("System", "Chat inputs not found on page.");
      return;
    }
    const firstName = nameEl.value || "Visitor";
    const message = (input.value || "").trim();
    if (!message) return;

    addMsg(firstName + "2 (you)", message);
    setBusy(true);

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, message }),
      });

      const text = await res.text();
      let data = {};
      try { data = JSON.parse(text || "{}"); } catch {}

      if (!res.ok) {
        addMsg("System", `Error ${res.status}: ${data.error || text || "Request failed"}`);
      } else {
        addMsg(data.roleName || (firstName + "2"), data.text || "(no reply text)");
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
      }
    } catch (err) {
      addMsg("System", `Network error: ${String(err)}`);
    } finally {
      setBusy(false);
      input.value = "";
      input.focus();
    }
  }

  function wire() {
    const form = $("#twin-form");
    const btn = $("#twin-send");
    const ids = {
      firstname: !!$("#twin-firstname"),
      input: !!$("#twin-input"),
      log: !!$("#twin-log"),
      form: !!form,
      btn: !!btn,
    };
    log("vbyu-chat.js loaded; elements:", ids);

    if (!ids.firstname || !ids.input || !ids.log) {
      console.warn("[VaultedByU] Missing required elements (check IDs in page markup).");
    }
    if (form) form.addEventListener("submit", sendMessage);
    if (btn) btn.addEventListener("click", sendMessage);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wire);
  } else {
    wire();
  }
})();
