// doke-alerts.js
// Padroniza alertas e adiciona mais notificações (toast) sem mexer na lógica do seu app.
(()=>{
  const safeStr = (v)=> (v==null ? "" : String(v));
  const clamp = (s, n=240)=> s.length>n ? (s.slice(0,n-1)+"…") : s;

  // Fallback toast (caso doke-toast.js não esteja carregado)
  function fallbackToast(message, opts={}){
    const type = opts.type || "info";
    const title = opts.title || "";
    let stack = document.querySelector(".doke-toast-stack");
    if(!stack){
      stack = document.createElement("div");
      stack.className = "doke-toast-stack";
      // estilo mínimo pra funcionar mesmo sem doke-toast.css
      stack.style.position = "fixed";
      stack.style.right = "14px";
      stack.style.bottom = "14px";
      stack.style.zIndex = "99999";
      stack.style.display = "grid";
      stack.style.gap = "10px";
      document.body.appendChild(stack);
    }
    const t = document.createElement("div");
    t.style.background = "#fff";
    t.style.border = "1px solid rgba(0,0,0,.08)";
    t.style.borderLeft = "5px solid " + (
      type==="success" ? "#0b7768" :
      type==="error" ? "#dc3545" :
      type==="warning" ? "#f0ad4e" : "#0b5ed7"
    );
    t.style.borderRadius = "14px";
    t.style.boxShadow = "0 12px 30px rgba(0,0,0,.10)";
    t.style.padding = "12px 12px";
    t.style.maxWidth = "360px";
    t.innerHTML = (title ? `<div style="font-weight:700;margin-bottom:4px">${title}</div>` : "") +
                  `<div style="color:#4b5563;font-size:13.5px;line-height:1.25">${clamp(safeStr(message), 420)}</div>`;
    stack.appendChild(t);
    setTimeout(()=>{ t.style.opacity="0"; t.style.transform="translateY(6px)"; t.style.transition="all .25s ease"; }, 3600);
    setTimeout(()=>{ t.remove(); }, 4200);
  }

  function toast(message, opts={}){
    if(typeof window.dokeToast === "function") return window.dokeToast(message, opts);
    return fallbackToast(message, opts);
  }

    function isDebug(){
    try{
      if(window.DOKE_CONFIG && window.DOKE_CONFIG.debug) return true;
      if(localStorage.getItem("DOKE_DEBUG") === "1") return true;
    }catch(e){}
    return false;
  }

// Compat: muitos scripts usam mostrarToast()
  if(typeof window.mostrarToast !== "function"){
    window.mostrarToast = (msg, tipo="info", titulo="") => toast(msg, {type: tipo, title: titulo});
  }
  if(typeof window.mostrarSucesso !== "function"){
    window.mostrarSucesso = (msg, titulo="Sucesso") => toast(msg, {type:"success", title: titulo});
  }
  if(typeof window.mostrarErro !== "function"){
    window.mostrarErro = (msg, titulo="Erro") => toast(msg, {type:"error", title: titulo});
  }
  // Barra offline (discreta)
  function ensureOfflineBar(){
    let bar = document.querySelector(".doke-offlineBar");
    if(bar) return bar;
    bar = document.createElement("div");
    bar.className = "doke-offlineBar";
    bar.textContent = "Você está sem conexão. Algumas ações podem falhar.";
    document.body.appendChild(bar);
    return bar;
  }
  function updateOnlineUI(){
    const bar = ensureOfflineBar();
    if(navigator.onLine){
      bar.classList.remove("is-on");
    } else {
      bar.classList.add("is-on");
    }
  }

  // Melhorar alertas inline comuns (ex: #msg, .msg)
  function upgradeInline(el){
    if(!el || el.dataset && el.dataset.dokeUpgraded) return;
    try{
      if(el.dataset) el.dataset.dokeUpgraded = "1";
      // class base
      el.classList.add("doke-alert");
      const txt = (el.textContent || "").toLowerCase();
      const cls =
        txt.includes("sucesso") || txt.includes("feito") || txt.includes("enviado") ? "doke-alert--success" :
        txt.includes("erro") || txt.includes("falha") || txt.includes("inválid") || txt.includes("inval") ? "doke-alert--error" :
        txt.includes("atenção") || txt.includes("atencao") || txt.includes("aviso") ? "doke-alert--warning" :
        "doke-alert--info";
      el.classList.add(cls);
      // Se for muito simples, criar title/text
      if(!el.querySelector(".doke-alert__title")){
        const raw = el.innerHTML.trim();
        // não reformatar se já tem markup complexo
        if(raw && raw.length < 220 && !raw.includes("<div") && !raw.includes("<p") && !raw.includes("<ul")){
          el.innerHTML = `<div class="doke-alert__title">${cls==="doke-alert--error"?"Erro":cls==="doke-alert--success"?"Sucesso":cls==="doke-alert--warning"?"Atenção":"Aviso"}</div>`+
                         `<div class="doke-alert__text">${raw}</div>`;
        }
      }
    }catch(_){}
  }

  function scanInline(){
    const selectors = [
      "#msg", "#mensagem", "[role='alert']",
      ".alert", ".msg", ".mensagem", ".message",
      ".error", ".success", ".warning", ".info"
    ];
    document.querySelectorAll(selectors.join(",")).forEach(upgradeInline);
  }

  // Captura erros globais para notificação (sem travar UX)
    window.addEventListener("error", (e)=>{
    const msg = e && (e.message || e.error && e.error.message) ? (e.message || e.error.message) : "Ocorreu um erro inesperado.";
    try{ console.error(e); }catch(_){}
    if(isDebug()){
      toast(clamp(safeStr(msg), 220), {type:"error", title:"Erro"});
    }
  });

    window.addEventListener("unhandledrejection", (e)=>{
    const reason = e && e.reason ? (e.reason.message || safeStr(e.reason)) : "Falha inesperada.";
    try{ console.error(e); }catch(_){}
    if(isDebug()){
      toast(clamp(safeStr(reason), 220), {type:"error", title:"Erro"});
    }
  });

    window.addEventListener("online", ()=>{
    updateOnlineUI();
    if(isDebug()) toast("Conexão restaurada.", {type:"success", title:"Online"});
  });
    window.addEventListener("offline", ()=>{
    updateOnlineUI();
    if(isDebug()) toast("Sem conexão no momento.", {type:"warning", title:"Offline"});
  });

  // Boot
  function boot(){
    updateOnlineUI();
    scanInline();

    // Observa alterações (p/ mensagens que aparecem via JS)
    const obs = new MutationObserver(()=> scanInline());
    obs.observe(document.documentElement, {subtree:true, childList:true, characterData:true});
  }
  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot, {once:true});
  } else {
    boot();
  }
})();
