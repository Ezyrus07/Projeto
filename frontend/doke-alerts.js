// doke-alerts.js
// Padroniza alertas, mostra falhas de carregamento e corrige textos com encoding quebrado.
(()=>{
  const safeStr = (v)=> (v == null ? "" : String(v));
  const clamp = (s, n = 240)=> s.length > n ? `${s.slice(0, n - 3)}...` : s;
  const notifyMem = new Map();
  const MOJIBAKE_RE = /Ã|Â|â|ï¿½|�/;
  const ATTRS_TO_FIX = ["placeholder", "title", "aria-label", "alt"];
  window.__DOKE_DISABLE_TOAST_GLOBAL_HANDLERS__ = true;
  window.__DOKE_ALERTS_HANDLERS_ACTIVE = true;

  function isDebug(){
    try{
      if(window.DOKE_CONFIG && window.DOKE_CONFIG.debug) return true;
      if(localStorage.getItem("DOKE_DEBUG") === "1") return true;
    }catch(_){ }
    return false;
  }

  function shouldNotify(key, cooldownMs = 12000){
    const now = Date.now();
    const last = Number(notifyMem.get(key) || 0);
    if((now - last) < cooldownMs) return false;
    notifyMem.set(key, now);
    return true;
  }

  function normalizeType(type){
    if(type === "warning") return "warn";
    if(type === "erro") return "error";
    return type || "info";
  }

  // Fallback toast (caso doke-toast.js não esteja carregado)
  function fallbackToast(message, opts = {}){
    const type = normalizeType(opts.type || "info");
    const title = safeStr(opts.title || "");
    let stack = document.querySelector(".doke-toast-stack");
    if(!stack){
      stack = document.createElement("div");
      stack.className = "doke-toast-stack";
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
      type === "success" ? "#0b7768" :
      type === "error" ? "#dc3545" :
      type === "warn" ? "#f0ad4e" : "#0b5ed7"
    );
    t.style.borderRadius = "14px";
    t.style.boxShadow = "0 12px 30px rgba(0,0,0,.10)";
    t.style.padding = "12px";
    t.style.maxWidth = "420px";
    t.innerHTML =
      (title ? `<div style="font-weight:700;margin-bottom:4px">${title}</div>` : "") +
      `<div style="color:#4b5563;font-size:13.5px;line-height:1.25">${clamp(safeStr(message), 520)}</div>`;
    stack.appendChild(t);
    setTimeout(()=>{
      t.style.opacity = "0";
      t.style.transform = "translateY(6px)";
      t.style.transition = "all .25s ease";
    }, 3800);
    setTimeout(()=> t.remove(), 4500);
  }

  function toast(message, opts = {}){
    const payload = (typeof message === "object" && message)
      ? message
      : { message: safeStr(message), ...(opts || {}) };
    payload.type = normalizeType(payload.type || "info");
    payload.message = safeStr(payload.message || "");
    payload.title = safeStr(payload.title || "");
    if(typeof window.dokeToast === "function"){
      try{ return window.dokeToast(payload); }catch(_){ }
      try{ return window.dokeToast(payload.message, payload); }catch(_){ }
    }
    return fallbackToast(payload.message, payload);
  }

  function notifyOnce(key, payload, cooldownMs){
    if(!shouldNotify(key, cooldownMs)) return;
    toast(payload);
  }

  // Compat: muitos scripts usam mostrarToast()
  if(typeof window.mostrarToast !== "function"){
    window.mostrarToast = (msg, tipo = "info", titulo = "") => toast(msg, { type: tipo, title: titulo });
  }
  if(typeof window.mostrarSucesso !== "function"){
    window.mostrarSucesso = (msg, titulo = "Sucesso") => toast(msg, { type: "success", title: titulo });
  }
  if(typeof window.mostrarErro !== "function"){
    window.mostrarErro = (msg, titulo = "Erro") => toast(msg, { type: "error", title: titulo });
  }

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
    }else{
      bar.classList.add("is-on");
    }
  }

  function isNoiseMessage(msg){
    const m = String(msg || "");
    return (
      m.includes("ResizeObserver loop") ||
      m.includes("Script error.") ||
      m.includes("Non-Error promise rejection captured")
    );
  }

  function isNetworkLike(msg){
    const m = String(msg || "").toLowerCase();
    return (
      m.includes("failed to fetch") ||
      m.includes("network") ||
      m.includes("timeout") ||
      m.includes("connection reset") ||
      m.includes("cors") ||
      m.includes("error code: 520")
    );
  }

  function formatStatusMessage(status){
    const s = Number(status || 0);
    if(s === 400) return "Consulta inválida (400). Verifique colunas e filtros.";
    if(s === 401 || s === 403) return "Sem permissão de leitura no banco (policy RLS).";
    if(s === 404) return "Recurso/rota não encontrado (404).";
    if(s === 429) return "Muitas requisições. Aguarde alguns segundos.";
    if(s === 520 || s >= 500) return "Servidor indisponível no momento (5xx/520).";
    if(s === 0) return "Falha de rede ao consultar o banco.";
    return `Falha de carregamento (HTTP ${s || "?"}).`;
  }

  function isApiUrl(url){
    const u = String(url || "");
    return /\/rest\/v1\/|\/auth\/v1\/|\/storage\/v1\//i.test(u);
  }

  function makeEndpointKey(url){
    try{
      const u = new URL(String(url || ""), location.origin);
      const keys = Array.from(new Set(Array.from(u.searchParams.keys()))).sort().join("&");
      return `${u.pathname}?${keys}`;
    }catch(_){
      return String(url || "").split("?")[0];
    }
  }

  function notifyHttpFailure(meta){
    const status = Number(meta?.status || 0);
    const method = String(meta?.method || "GET").toUpperCase();
    const url = String(meta?.url || "");
    if(!isApiUrl(url)) return;
    const key = `http:${status}:${method}:${makeEndpointKey(url)}`;
    const msg = formatStatusMessage(status);
    const details = {
      status,
      statusText: safeStr(meta?.statusText || ""),
      method,
      url,
      source: "fetch",
      at: new Date().toISOString()
    };
    notifyOnce(key, {
      type: status >= 500 || status === 0 ? "error" : "warn",
      title: "Falha ao carregar dados",
      message: msg,
      details
    }, 12000);
  }

  function patchFetchNotifications(){
    if(window.__DOKE_ALERTS_FETCH_PATCHED__) return;
    if(typeof window.fetch !== "function") return;
    const nativeFetch = window.fetch.bind(window);
    window.__DOKE_ALERTS_FETCH_PATCHED__ = true;
    window.fetch = async function(input, init){
      const method = String((init && init.method) || "GET").toUpperCase();
      const url = (typeof input === "string") ? input : (input && input.url ? String(input.url) : "");
      try{
        const resp = await nativeFetch(input, init);
        if(resp && !resp.ok){
          notifyHttpFailure({
            status: resp.status,
            statusText: resp.statusText,
            method,
            url
          });
        }
        return resp;
      }catch(err){
        notifyHttpFailure({
          status: 0,
          statusText: safeStr(err && err.message ? err.message : "network_error"),
          method,
          url
        });
        throw err;
      }
    };
  }

  function decodeLatin1AsUtf8(str){
    try{
      const s = safeStr(str);
      const bytes = new Uint8Array(s.length);
      for(let i = 0; i < s.length; i += 1){
        bytes[i] = s.charCodeAt(i) & 0xff;
      }
      return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    }catch(_){
      return safeStr(str);
    }
  }

  function mojibakeScore(str){
    const s = safeStr(str);
    let score = 0;
    score += (s.match(/Ã/g) || []).length * 2;
    score += (s.match(/Â/g) || []).length * 2;
    score += (s.match(/â/g) || []).length * 2;
    score += (s.match(/ï¿½/g) || []).length * 3;
    score += (s.match(/�/g) || []).length * 3;
    return score;
  }

  function fixAsciiTypos(str){
    let out = safeStr(str);
    out = out.replace(/\bFaca\b/g, "Faça");
    out = out.replace(/\bfaca\b/g, "faça");
    out = out.replace(/\bNao\b/g, "Não");
    out = out.replace(/\bnao\b/g, "não");
    out = out.replace(/\bPublicacoes\b/g, "Publicações");
    out = out.replace(/\bpublicacoes\b/g, "publicações");
    out = out.replace(/\bpublicacao\b/g, "publicação");
    out = out.replace(/\bAnuncio\b/g, "Anúncio");
    out = out.replace(/\banuncio\b/g, "anúncio");
    out = out.replace(/\bVideos\b/g, "Vídeos");
    out = out.replace(/\bvideos\b/g, "vídeos");
    out = out.replace(/\bNotificacoes\b/g, "Notificações");
    out = out.replace(/\bnotificacoes\b/g, "notificações");
    out = out.replace(/\bUsuario\b/g, "Usuário");
    out = out.replace(/\busuario\b/g, "usuário");
    out = out.replace(/\bInicio\b/g, "Início");
    out = out.replace(/\binicio\b/g, "início");
    out = out.replace(/\bServico\b/g, "Serviço");
    out = out.replace(/\bservico\b/g, "serviço");
    out = out.replace(/\bDescricao\b/g, "Descrição");
    out = out.replace(/\bdescricao\b/g, "descrição");
    out = out.replace(/\bAvaliacoes\b/g, "Avaliações");
    out = out.replace(/\bavaliacoes\b/g, "avaliações");
    out = out.replace(/\bindisponivel\b/g, "indisponível");
    return out;
  }

  function normalizeText(str){
    let out = safeStr(str);
    if(MOJIBAKE_RE.test(out)){
      let best = out;
      let bestScore = mojibakeScore(out);
      let cur = out;
      for(let i = 0; i < 3; i += 1){
        const decoded = decodeLatin1AsUtf8(cur);
        if(!decoded || decoded === cur) break;
        const score = mojibakeScore(decoded);
        if(score <= bestScore){
          best = decoded;
          bestScore = score;
        }
        cur = decoded;
        if(score === 0) break;
      }
      out = best;
    }
    out = fixAsciiTypos(out);
    return out;
  }

  function shouldSkipTextNode(node){
    const parent = node && node.parentElement;
    if(!parent) return false;
    const tag = parent.tagName;
    return /^(SCRIPT|STYLE|NOSCRIPT|CODE|PRE|TEXTAREA|OPTION)$/.test(tag);
  }

  function fixNodeText(node){
    if(!node || node.nodeType !== Node.TEXT_NODE) return false;
    if(shouldSkipTextNode(node)) return false;
    const raw = node.nodeValue;
    if(!raw || !raw.trim()) return false;
    const fixed = normalizeText(raw);
    if(fixed !== raw){
      node.nodeValue = fixed;
      return true;
    }
    return false;
  }

  function fixAttributes(el){
    if(!el || el.nodeType !== Node.ELEMENT_NODE) return false;
    let changed = false;
    for(const attr of ATTRS_TO_FIX){
      if(!el.hasAttribute(attr)) continue;
      const raw = el.getAttribute(attr);
      const fixed = normalizeText(raw);
      if(fixed !== raw){
        el.setAttribute(attr, fixed);
        changed = true;
      }
    }
    return changed;
  }

  function repairTextTree(root){
    if(!root) return 0;
    let changes = 0;
    if(root.nodeType === Node.TEXT_NODE){
      if(fixNodeText(root)) changes += 1;
      return changes;
    }
    if(root.nodeType === Node.ELEMENT_NODE){
      if(fixAttributes(root)) changes += 1;
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
      let node = walker.nextNode();
      while(node){
        if(fixNodeText(node)) changes += 1;
        node = walker.nextNode();
      }
      root.querySelectorAll("[placeholder],[title],[aria-label],[alt]").forEach((el)=>{
        if(fixAttributes(el)) changes += 1;
      });
    }
    return changes;
  }

  let repairPending = false;
  function scheduleRepair(root){
    if(repairPending) return;
    repairPending = true;
    const target = root || document.body || document.documentElement;
    const exec = ()=>{
      repairPending = false;
      try{ repairTextTree(target); }catch(_){ }
    };
    if(typeof window.requestAnimationFrame === "function"){
      window.requestAnimationFrame(exec);
    }else{
      setTimeout(exec, 0);
    }
  }

  function patchNativeDialogs(){
    if(window.__DOKE_DIALOGS_PATCHED__) return;
    window.__DOKE_DIALOGS_PATCHED__ = true;
    if(typeof window.alert === "function"){
      const rawAlert = window.alert.bind(window);
      window.alert = (msg)=> rawAlert(normalizeText(safeStr(msg)));
    }
    if(typeof window.confirm === "function"){
      const rawConfirm = window.confirm.bind(window);
      window.confirm = (msg)=> rawConfirm(normalizeText(safeStr(msg)));
    }
  }

  // Melhorar alertas inline comuns (ex: #msg, .msg)
  function upgradeInline(el){
    if(!el || (el.dataset && el.dataset.dokeUpgraded)) return;
    try{
      if(el.dataset) el.dataset.dokeUpgraded = "1";
      el.classList.add("doke-alert");
      const txt = normalizeText(el.textContent || "").toLowerCase();
      const cls =
        txt.includes("sucesso") || txt.includes("feito") || txt.includes("enviado") ? "doke-alert--success" :
        txt.includes("erro") || txt.includes("falha") || txt.includes("inválid") || txt.includes("inval") ? "doke-alert--error" :
        txt.includes("atenção") || txt.includes("atencao") || txt.includes("aviso") ? "doke-alert--warning" :
        "doke-alert--info";
      el.classList.add(cls);
      if(!el.querySelector(".doke-alert__title")){
        const raw = (el.innerHTML || "").trim();
        if(raw && raw.length < 220 && !raw.includes("<div") && !raw.includes("<p") && !raw.includes("<ul")){
          el.innerHTML =
            `<div class="doke-alert__title">${cls === "doke-alert--error" ? "Erro" : cls === "doke-alert--success" ? "Sucesso" : cls === "doke-alert--warning" ? "Atenção" : "Aviso"}</div>` +
            `<div class="doke-alert__text">${normalizeText(raw)}</div>`;
        }
      }
    }catch(_){ }
  }

  function scanInline(){
    const selectors = [
      "#msg", "#mensagem", "[role='alert']",
      ".alert", ".msg", ".mensagem", ".message",
      ".error", ".success", ".warning", ".info"
    ];
    document.querySelectorAll(selectors.join(",")).forEach(upgradeInline);
  }

  window.addEventListener("error", (e)=>{
    const msg = (e && (e.message || (e.error && e.error.message))) ? String(e.message || e.error.message) : "Erro inesperado.";
    if(isNoiseMessage(msg)) return;
    try{ console.error(e); }catch(_){ }
    const key = `error:${msg}`;
    if(isDebug() || isNetworkLike(msg)){
      notifyOnce(key, {
        type: "error",
        title: "Erro de carregamento",
        message: clamp(normalizeText(msg), 260),
        details: {
          file: e && e.filename ? e.filename : "",
          line: e && e.lineno ? e.lineno : 0,
          col: e && e.colno ? e.colno : 0,
          stack: e && e.error && e.error.stack ? String(e.error.stack) : ""
        }
      }, 10000);
    }
  });

  window.addEventListener("unhandledrejection", (e)=>{
    const reason = e && e.reason ? (e.reason.message || safeStr(e.reason)) : "Falha inesperada.";
    if(isNoiseMessage(reason)) return;
    try{ console.error(e); }catch(_){ }
    const key = `promise:${reason}`;
    if(isDebug() || isNetworkLike(reason)){
      notifyOnce(key, {
        type: "error",
        title: "Falha em segundo plano",
        message: clamp(normalizeText(reason), 260),
        details: (typeof e.reason === "object" && e.reason) ? e.reason : { reason: safeStr(reason) }
      }, 10000);
    }
  });

  window.addEventListener("online", ()=>{
    updateOnlineUI();
    notifyOnce("net:online", { type: "success", title: "Online", message: "Conexão restaurada." }, 3000);
  });

  window.addEventListener("offline", ()=>{
    updateOnlineUI();
    notifyOnce("net:offline", { type: "warn", title: "Offline", message: "Sem conexão no momento." }, 3000);
  });

  function boot(){
    updateOnlineUI();
    patchNativeDialogs();
    patchFetchNotifications();
    scanInline();
    scheduleRepair(document.body || document.documentElement);

    window.dokeRepairText = ()=> scheduleRepair(document.body || document.documentElement);
    window.dokeNotifyLoadError = (payload)=> notifyHttpFailure(payload || {});

    const obs = new MutationObserver((entries)=>{
      scanInline();
      for(const entry of entries){
        if(entry.type === "characterData" && entry.target){
          scheduleRepair(entry.target);
          continue;
        }
        if(entry.addedNodes && entry.addedNodes.length){
          entry.addedNodes.forEach((node)=> scheduleRepair(node));
        }
      }
    });
    obs.observe(document.documentElement, { subtree: true, childList: true, characterData: true });
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  }else{
    boot();
  }
})();
