// public/chat.js
(() => {
console.info("[VaultedByU] vybu-chat.js loaded");
const API_URL = "https://vbyu-assistant.vercel.app/api/chat";
const $ = (s) => document.querySelector(s);
  
  function addMsg(who, text) {
    const row = document.createElement("div");
    row.className = "row";
    row.innerHTML = `<strong>${who}:</strong> <span>${text}</span>`;
    const log = $("#twin-log");
    log.appendChild(row);
    log.scrollTop = log.scrollHeight;
  }
  function setBusy(b) {
    const btn = $("#twin-send");
    const input = $("#twin-input");
    btn.disabled = b; input.disabled = b;
    btn.textContent = b ? "Sending…" : "Send";
  }

  async function sendMessage(ev) {
    ev?.preventDefault?.();
    const input = $("#twin-input");
    const firstName = $("#twin-firstname")?.value || "Visitor";
    const message = input.value.trim();
    if (!message) return;

    addMsg(firstName + "2 (you)", message);
    setBusy(true);

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, message })
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
          $("#twin-log").appendChild(row);
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
    if (form) form.addEventListener("submit", sendMessage);
    if (btn) btn.addEventListener("click", sendMessage);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wire);
  } else {
    wire();
  }
})();
