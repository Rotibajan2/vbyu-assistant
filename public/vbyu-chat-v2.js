<!-- /public/vbyu-chat-v2.js -->
(() => {
  const API_URL = "/api/chat"; // same-origin
  const log = (...a) => console.info("[VaultedByU v2]", ...a);

  // quick console test: window.twinPing()
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
      console.error("[VaultedByU v2] ping error:", e);
    }
  };

  function $(s) { return document.querySelector(s); }

  // escape for user text
  function escapeHTML(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Add a message row. AI messages may include HTML (e.g., <a href="/...">)
  function addMsg(who, text, cls) {
    const row = document.createElement("div");
    row.className = "row " + (cls || "");
    row.style.cssText = "display:flex;gap:8px;margin:6px 0;";

    const whoEl = document.createElement("strong");
    whoEl.textContent = who + ":";
    whoEl.style.color = "#0f172a";

    const bubble = document.createElement("span");
    bubble.className = "bubble";
    bubble.style.cssText =
      "display:inline-block;padding:6px 10px;border-radius:10px;background:#fff;border:1px solid #e5e7eb;";

    const isAI = cls === "ai" || /^vaultedbyu$/i.test(who);

    if (isAI) {
      // TRUSTED server output: allow HTML so links are clickable
      bubble.innerHTML = text || "";
    } else {
      // user text gets escaped
      bubble.textContent = text || "";
      bubble.innerHTML = escapeHTML(bubble.textContent);
    }

    if (cls === "me") {
      bubble.style.background = "#e8f0ff";
      bubble.style.borderColor = "#c7dcff";
    }

    row.appendChild(whoEl);
    row.appendChild(bubble);

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

    addMsg(firstName + "2 (you)", message, "me");
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
        addMsg("System", `Error ${res.status}: ${data.error || text || "Request failed"}`, "ai");
      } else {
        const who = (data.roleName || "VaultedByU");
        const reply = (data.text || "(no reply text)");
        // render AI with HTML so <a href="/..."> works
        addMsg(who, reply, "ai");

        // also append explicit action link (your UI already supported this)
        if (data.action?.type === "open_page" && data.action.url) {
          const row = document.createElement("div");
          row.className = "row";
          row.style.cssText = "margin:4px 0;";
          const a = document.createElement("a");
          a.href = data.action.url;           // relative is fine
          a.textContent = `Open ${data.action.url}`;
          a.target = "_self";
          row.append("Action: ", a);
          const box = $("#twin-log");
          if (box) {
            box.appendChild(row);
            box.scrollTop = box.scrollHeight;
          }
        }
      }
    } catch (err) {
      addMsg("System", `Network error: ${String(err)}`, "ai");
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
    log("vbyu-chat-v2.js loaded; elements:", ids);

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
