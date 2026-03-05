// STEP A2 - Reliability upgrades (network backoff + user feedback)
// Safe: GET-only, Supabase endpoints only. Does not touch writes.
(function(){
  'use strict';
  if (window.__DOKE_STEP_A2__) return;
  window.__DOKE_STEP_A2__ = true;

  const ORIGIN = location.origin;
  const MAX_RETRIES = 2; // in addition to first attempt (total 3)
  const BASE_DELAYS = [500, 1500]; // ms
  const JITTER = 0.25;

  function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }

  function isSupabaseDataUrl(url){
    try{
      const u = new URL(url, ORIGIN);
      const p = u.pathname || "";
      if (p.includes("/auth/v1/")) return false;
      return (
        p.includes("/rest/v1/") ||
        p.includes("/storage/v1/") ||
        p.includes("/functions/v1/") ||
        p.startsWith("/rest/v1/") ||
        p.startsWith("/storage/v1/") ||
        p.startsWith("/functions/v1/") ||
        (String(u.hostname||"").includes("supabase") && (p.includes("/v1/") || p.includes("/rest/")))
      );
    }catch(_){ return false; }
  }

  // ---- tiny toast (one-liner) ----
  function ensureToastStyle(){
    if (document.getElementById("doke-a2-toast-style")) return;
    const st = document.createElement("style");
    st.id = "doke-a2-toast-style";
    st.textContent = `
      .doke-toast-a2{position:fixed;left:50%;transform:translateX(-50%);bottom:18px;z-index:99999;
        background:rgba(10,20,25,.92);color:#fff;padding:10px 12px;border-radius:12px;
        font:600 13px/1.2 system-ui,-apple-system,Segoe UI,Roboto,Arial;box-shadow:0 10px 30px rgba(0,0,0,.22);
        max-width:min(92vw,560px);display:flex;gap:10px;align-items:center}
      .doke-toast-a2 button{background:transparent;border:0;color:#9fe7d7;font:700 13px system-ui;cursor:pointer}
      @media (min-width: 900px){ .doke-toast-a2{left:auto;right:18px;transform:none;bottom:18px;} }
    `;
    document.head.appendChild(st);
  }
  let toastTimer=null;
  function showToast(msg, actionText, actionFn){
    try{
      ensureToastStyle();
      let el = document.querySelector(".doke-toast-a2");
      if(!el){
        el = document.createElement("div");
        el.className="doke-toast-a2";
        document.body.appendChild(el);
      }
      el.innerHTML = "";
      const span = document.createElement("span");
      span.textContent = msg;
      el.appendChild(span);
      if(actionText && typeof actionFn === "function"){
        const btn=document.createElement("button");
        btn.type="button";
        btn.textContent=actionText;
        btn.addEventListener("click", ()=>{ try{ actionFn(); }catch(_){} });
        el.appendChild(btn);
      }
      el.style.display="flex";
      if(toastTimer) clearTimeout(toastTimer);
      toastTimer=setTimeout(()=>{ try{ el.style.display="none"; }catch(_){} }, 4200);
    }catch(_){}
  }

  // Avoid spamming toasts
  let lastToastAt=0;
  function maybeToastOncePerBurst(msg){
    const now=Date.now();
    if(now-lastToastAt<4500) return;
    lastToastAt=now;
    showToast(msg, "Recarregar", ()=>location.reload());
  }

  const _fetch = window.fetch ? window.fetch.bind(window) : null;
  if(!_fetch) return;

  async function doFetch(input, init){
    return _fetch(input, init);
  }

  function getUrl(input){
    return (typeof input === "string") ? input : (input && input.url) ? input.url : "";
  }
  function getMethod(input, init){
    return (init && init.method) ? String(init.method).toUpperCase()
      : (input && input.method) ? String(input.method).toUpperCase() : "GET";
  }

  window.fetch = async function(input, init){
    const url = getUrl(input);
    const method = getMethod(input, init);
    if(method !== "GET" || !url || !isSupabaseDataUrl(url)){
      return doFetch(input, init);
    }

    // Backoff retry for transient statuses
    let attempt = 0;
    let res = null;
    let lastErr = null;

    while(attempt <= MAX_RETRIES){
      try{
        res = await doFetch(input, init);
        if(res && (res.status === 429 || (res.status >= 500 && res.status <= 599))){
          // transient error -> retry
          if(attempt < MAX_RETRIES){
            const base = BASE_DELAYS[Math.min(attempt, BASE_DELAYS.length-1)];
            const jitter = base * (Math.random() * JITTER);
            await sleep(base + jitter);
            attempt++;
            continue;
          }
        }
        // ok or non-retriable
        return res;
      }catch(e){
        lastErr = e;
        if(attempt < MAX_RETRIES){
          const base = BASE_DELAYS[Math.min(attempt, BASE_DELAYS.length-1)];
          const jitter = base * (Math.random() * JITTER);
          await sleep(base + jitter);
          attempt++;
          continue;
        }
      }
      break;
    }

    // If we reached here, we failed after retries; broadcast & show a clean toast
    try{
      window.dispatchEvent(new CustomEvent("doke:net-fail", { detail: { url, status: res ? res.status : 0, error: lastErr ? String(lastErr) : "" } }));
    }catch(_){}

    // Only toast for key user-facing screens
    const path = (location.pathname||"").toLowerCase();
    const hash = (location.hash||"").toLowerCase();
    const isKey = /mensagens|pedido|notifica|perfil/.test(path) || /mensagens|pedido|notifica|perfil/.test(hash);
    if(isKey){
      maybeToastOncePerBurst("Conexão instável — tentando carregar novamente…");
    }

    // Return what we have; if null, fallback to real fetch (keeps behavior)
    if(res) return res;
    return doFetch(input, init);
  };

  // Hook auth-expired to show a toast and guide user
  window.addEventListener("doke:auth-expired", ()=>{
    showToast("Sessão expirada — faça login novamente.", "Entrar", ()=>{
      try{
        const next = encodeURIComponent(location.pathname + location.search);
        location.href = "login.html?next=" + next;
      }catch(_){ location.href="login.html"; }
    });
  });

})();
