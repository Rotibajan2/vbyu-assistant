// app/vbyu-chat-v2.js/route.ts
export const runtime = "edge";

// paste your JS source between backticks ↓
const js = `(() => {
  const API_URL = "/api/chat";
  const log = (...a) => console.info("[VaultedByU v2]", ...a);
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
    } catch (e) { console.error("[VaultedByU v2] ping error:", e); }
  };
  function $(s){return document.querySelector(s)}
  function addMsg(w,t){const r=document.createElement("div");r.className="row";r.innerHTML=\`<strong>\${w}:</strong> <span>\${t}</span>\`;const b=$("#twin-log");if(!b)return;b.appendChild(r);b.scrollTop=b.scrollHeight}
  function setBusy(b){const btn=$("#twin-send"),input=$("#twin-input");if(btn)btn.disabled=b;if(btn)btn.textContent=b?"Sending…":"Send";if(input)input.disabled=b}
  async function sendMessage(ev){
    ev?.preventDefault?.();
    const input=$("#twin-input"), nameEl=$("#twin-firstname");
    if(!input||!nameEl){addMsg("System","Chat inputs not found on page.");return;}
    const firstName=nameEl.value||"Visitor";
    const message=(input.value||"").trim(); if(!message) return;
    addMsg(firstName+"2 (you)", message); setBusy(true);
    try{
      const res=await fetch(API_URL,{method:"POST",headers:{"Content-Type":"application/json"},credentials:"same-origin",body:JSON.stringify({firstName,message})});
      const raw=await res.text(); let data={}; if(raw){try{data=JSON.parse(raw)}catch{}}
      if(!res.ok){addMsg("System",\`Error \${res.status}: \${data.error||raw||"Request failed"}\`);}
      else{
        const replyName=data.roleName||(firstName+"2");
        const replyText=(typeof data.text==="string"&&data.text.trim())?data.text:"(no reply text)";
        addMsg(replyName,replyText);
        if(data.action?.type==="open_page" && data.action.url){
          const a=document.createElement("a"); a.href=data.action.url; a.textContent=\`Open \${data.action.url}\`; a.target="_self";
          const row=document.createElement("div"); row.className="row"; row.append("Action: ",a);
          const b=$("#twin-log"); if(b) b.appendChild(row);
        }
      }
    }catch(err){addMsg("System", "Network error: "+String(err));}
    finally{ setBusy(false); if(input){input.value=""; input.focus();} }
  }
  let wired=false;
  function wire(){
    if(wired) return; wired=true;
    const form=$("#twin-form"), btn=$("#twin-send");
    const ids={ firstname:!!$("#twin-firstname"), input:!!$("#twin-input"), log:!!$("#twin-log"), form:!!form, btn:!!btn };
    log("vbyu-chat-v2.js (route) loaded; elements:", ids);
    if(!ids.firstname||!ids.input||!ids.log){console.warn("[VaultedByU v2] Missing required elements.");}
    if(form) form.addEventListener("submit", sendMessage);
    if(btn) btn.addEventListener("click", sendMessage);
  }
  if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded", wire, {once:true});} else { wire(); }
})();`;

export async function GET() {
  return new Response(js, {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
