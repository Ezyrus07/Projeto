/* DOKE — Supabase init (global)
   ------------------------------------------------------------
   1) Cole aqui o Project URL e a ANON PUBLIC KEY (JWT grande)
      Settings > API > Project URL
      Settings > API > Project API keys > anon public
   2) Este arquivo cria: window.sb (cliente Supabase)
*/
(function(){
  // Dev CORS helper: algumas allowlists de CORS incluem apenas localhost.
  // Se você estiver usando Live Server em 127.0.0.1, redireciona para localhost.
  // Desative definindo window.DOKE_NO_LOCALHOST_REDIRECT = true antes deste script.
  try {
    if (!window.DOKE_NO_LOCALHOST_REDIRECT && typeof location !== 'undefined' && location.hostname === '127.0.0.1') {
      const to = String(location.href || '').replace('127.0.0.1', 'localhost');
      if (to && to !== location.href) { location.replace(to); return; }
    }
  } catch (_e) {}
  // Evita recriar o cliente em hot-reload / múltiplos scripts
  if (window.sb && typeof window.sb.from === "function") {
    console.log("[DOKE] Supabase já inicializado (global).");
    return;
  }
  const DEFAULT_URL = "https://wgbnoqjnvhasapqarltu.supabase.co";
  const DEFAULT_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndnYm5vcWpudmhhc2FwcWFybHR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwODEwMzgsImV4cCI6MjA4MzY1NzAzOH0.qZZQJ7To8EYe5eELG2DzwU9Vh0gn6tAkAbCLmns8ScQ";

  let localUrl = "";
  let localKey = "";
  const isLocalDev =
    typeof location !== "undefined" &&
    /^(localhost|127\.0\.0\.1)$/i.test(String(location.hostname || ""));

  // ------------------------------------------------------------
  // Dev Proxy detector (bypass CORS sem mexer no Supabase)
  // Se este projeto estiver rodando via doke-devserver.js,
  // existe a rota /__doke_proxy_ping e a URL base vira location.origin.
  // ------------------------------------------------------------
  let __dokeUseLocalProxy = false;
  try{
    if (isLocalDev && typeof location !== "undefined") {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", "/__doke_proxy_ping", false); // sync (só em dev)
      xhr.send(null);
      if (xhr.status >= 200 && xhr.status < 300) {
        __dokeUseLocalProxy = true;
      }
    }
  }catch(_e){ __dokeUseLocalProxy = false; }
  try {
    localUrl = localStorage.getItem("DOKE_SUPABASE_URL") || "";
    localKey = localStorage.getItem("DOKE_SUPABASE_ANON_KEY") || "";
  } catch (_e) {}

  function normalizeSupabaseUrl(raw){
    let value = String(raw || "").trim();
    if (!value) return "";
    try {
      const u = new URL(value);
      u.search = "";
      u.hash = "";
      u.pathname = String(u.pathname || "")
        .replace(/\/(auth|rest)\/v1.*$/i, "")
        .replace(/\/+$/g, "");
      return `${u.origin}${u.pathname}`;
    } catch (_e) {
      return value
        .replace(/\/(auth|rest)\/v1.*$/i, "")
        .replace(/\/+$/g, "");
    }
  }

  function normalizeSupabaseKey(raw){
    const value = String(raw || "").trim();
    if (!value) return "";
    return value;
  }

  // Se existir URL/KEY antigos no localStorage (de outro projeto), isso pode gerar CORS e páginas que “quebram” só quando loga.
  // Aqui a gente mantém override apenas se for explícito (window.DOKE_SUPABASE_URL / window.SUPABASE_URL).
  const EXPECTED_REF = (function(){
    try { return (new URL(DEFAULT_URL)).hostname.split(".")[0]; } catch(_e){ return ""; }
  })();

  const __DOKE_STORAGE_KEY = EXPECTED_REF ? (`sb-${EXPECTED_REF}-auth-token`) : undefined;

  function isSameProject(raw){
    try {
      const u = new URL(normalizeSupabaseUrl(raw));
      return u.hostname.split(".")[0] === EXPECTED_REF;
    } catch(_e) { return false; }
  }

  const explicitUrlOverride = (typeof window !== 'undefined') && (window.DOKE_SUPABASE_URL || window.SUPABASE_URL);
  if (!explicitUrlOverride && localUrl && EXPECTED_REF && !isSameProject(localUrl)) {
    try { console.warn('[DOKE] Ignorando Supabase URL salva (projeto diferente):', localUrl); } catch(_e) {}
    localUrl = '';
    localKey = '';
  }

const rawUrl =
  window.DOKE_SUPABASE_URL ||
  window.SUPABASE_URL ||
  localUrl ||
  DEFAULT_URL;

const normalizedUrl = normalizeSupabaseUrl(rawUrl);
let url = DEFAULT_URL;
try {
  const parsed = new URL(normalizedUrl || DEFAULT_URL);
  if (/^https?:$/i.test(parsed.protocol)) {
    const cleanPath = String(parsed.pathname || "").replace(/\/+$/g, "");
    url = `${parsed.origin}${cleanPath}`;
  }
} catch (_e) {
  url = DEFAULT_URL;
}

  

  // Se o devserver local estiver ativo, use o proxy na mesma origem
  // (as rotas /rest/v1 e /auth/v1 serão encaminhadas para o Supabase real).
  if (__dokeUseLocalProxy && typeof location !== "undefined") {
    try {
      url = location.origin;
      window.DOKE_SUPABASE_PROXY_ENABLED = true;
      window.DOKE_SUPABASE_PROXY_UPSTREAM = DEFAULT_URL;
    } catch(_e) {}
  }

  // ============================================================
  // PROXY FETCH REWRITE (DEV)
  // Se algum script ainda chamar https://<ref>.supabase.co/... diretamente,
  // reescrevemos para a MESMA origem (localhost) para passar pelo proxy.
  // ============================================================
  try {
    if (__dokeUseLocalProxy && typeof window !== "undefined" && typeof window.fetch === "function" && !window.fetch.__DOKE_PROXY_REWRITE__) {
      const upstreamHost = (new URL(DEFAULT_URL)).host;
      const originalFetch = window.fetch.bind(window);
      window.fetch = function(input, init) {
        try {
          // string URL
          if (typeof input === "string") {
            const u = new URL(input, location.origin);
            if (u.host === upstreamHost) {
              input = u.pathname + u.search + u.hash;
            }
          }
          // URL object
          else if (typeof URL !== "undefined" && input instanceof URL) {
            if (input.host === upstreamHost) {
              input = input.pathname + input.search + input.hash;
            }
          }
          // Request object
          else if (typeof Request !== "undefined" && input instanceof Request) {
            const u = new URL(input.url, location.origin);
            if (u.host === upstreamHost) {
              const newUrl = u.pathname + u.search + u.hash;
              try {
                const r = input.clone();
                input = new Request(newUrl, r);
              } catch(_e2) {
                input = new Request(newUrl, input);
              }
            }
          }
        } catch(_e) {}
        return originalFetch(input, init);
      };
      window.fetch.__DOKE_PROXY_REWRITE__ = true;
    }
  } catch(_e) {}

const rawKey =
  window.DOKE_SUPABASE_ANON_KEY ||
  window.SUPABASE_ANON_KEY ||
  localKey ||
  DEFAULT_KEY;

const keyCandidate = normalizeSupabaseKey(rawKey);
const key = /^eyJ[a-zA-Z0-9._-]+$/.test(keyCandidate) ? keyCandidate : DEFAULT_KEY;

  // Expõe configuração normalizada para scripts legados.
  window.SUPABASE_URL = url;
  window.SUPABASE_ANON_KEY = key;
  window.DOKE_SUPABASE_URL = url;
  window.DOKE_SUPABASE_ANON_KEY = key;

  // Higieniza chaves legadas para evitar criação de cliente com URL antiga/corrompida.
  try {
    localStorage.setItem("DOKE_SUPABASE_URL", (__dokeUseLocalProxy ? DEFAULT_URL : url));
    localStorage.setItem("SUPABASE_URL", (__dokeUseLocalProxy ? DEFAULT_URL : url));
    localStorage.setItem("supabase_url", (__dokeUseLocalProxy ? DEFAULT_URL : url));
    localStorage.setItem("DOKE_SUPABASE_ANON_KEY", key);
    localStorage.setItem("SUPABASE_ANON_KEY", key);
    localStorage.setItem("supabase_anon_key", key);
    const ref = (EXPECTED_REF || (new URL(DEFAULT_URL)).hostname.split(".")[0]);
    Object.keys(localStorage).forEach((k) => {
      if (!/^sb-[a-z0-9]+-auth-token$/i.test(k)) return;
      if (!k.startsWith(`sb-${ref}-`)) {
        localStorage.removeItem(k);
      }
    });
  } catch (_e) {}
  
  function warn(msg){ console.warn("[DOKE]", msg); }

  if (!window.supabase || !window.supabase.createClient) {
    warn("Biblioteca Supabase não carregada. Confira o <script src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'>");
    return;
  }

  if (!/^https?:\/\//i.test(url) || url.includes("YOURPROJECT")) {
    warn("SUPABASE_URL inválida ou não configurada. Edite supabase-init.js.");
  }
if (!key || key.startsWith("sb_publishable")) {
  warn("Chave incorreta. Use a ANON PUBLIC KEY (JWT grande) do Supabase.");
}

  // Corrige cache local antigo com URL quebrada (ex.: /auth/v1)
  try{
    if (localUrl && normalizeSupabaseUrl(localUrl) !== localUrl) {
      localStorage.setItem("DOKE_SUPABASE_URL", normalizeSupabaseUrl(localUrl));
    }
  }catch(_e){}


  try{
    window.sb = window.supabase.createClient(url, key, {
      db: { schema: 'public' },
      global: { fetch: (typeof window !== 'undefined' && window.fetch) ? window.fetch : undefined },
      // IMPORTANT:
      // NUNCA force "Content-Profile" globalmente.
      // Alguns setups de CORS/proxy bloqueiam esse header em requests GET,
      // causando "TypeError: Failed to fetch" (status 0) no supabase-js.
      // O supabase-js já envia Accept-Profile/Content-Profile apenas quando necessário
      // baseado em db.schema.
      auth: {
        persistSession: true,
        ...( __DOKE_STORAGE_KEY ? { storageKey: __DOKE_STORAGE_KEY } : {} ),
        // Evita enxurrada de refresh_token em ambientes com CORS/rede instável.
        autoRefreshToken: true,
        detectSessionInUrl: true,
      }
    });
    window.__DOKE_SUPABASE_INFO__ = { url, isLocalDev };
    console.log("[DOKE] Supabase conectado (global).");

    // ============================================================
    // Auth fallback (signInWithPassword)
    // - Em alguns ambientes, o supabase-js falha com "TypeError: Failed to fetch"
    //   por causa de preflight/CORS/antitracker. O REST via fetch costuma funcionar.
    // - Mantem a API original (retorna { data, error }).
    // ============================================================
    (function patchAuth(){
      try{
        if(!window.sb?.auth || window.sb.auth.__DOKE_AUTH_PATCHED__) return;
        const originalSignIn = window.sb.auth.signInWithPassword?.bind(window.sb.auth);
        if(typeof originalSignIn !== "function") return;

        function projectRef(){
          try { return (EXPECTED_REF || (new URL(DEFAULT_URL)).hostname.split(".")[0]); } catch(_e){ return null; }
        }

        async function signInViaFetch(email, password){
          const r = await fetch(`${url}/auth/v1/token?grant_type=password`, {
            method: "POST",
            headers: { apikey: key, "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
          });
          const text = await r.text();
          let json;
          try { json = JSON.parse(text); } catch(_e){ json = { message: text }; }
          if(!r.ok){
            return { data: { session: null, user: null }, error: json };
          }

          const expiresIn = Number(json.expires_in || 0);
          const expiresAt = json.expires_at ? Number(json.expires_at) : (expiresIn ? Math.floor(Date.now()/1000) + expiresIn : null);
          const session = {
            access_token: json.access_token,
            refresh_token: json.refresh_token,
            token_type: json.token_type || "bearer",
            expires_in: expiresIn,
            expires_at: expiresAt,
            user: json.user || null,
          };

          try{
            const ref = projectRef();
            if(ref){
              const storageKey = `sb-${ref}-auth-token`;
              localStorage.setItem(storageKey, JSON.stringify(session));
            }
          }catch(_e){}

          try{
            if(typeof window.sb.auth.setSession === "function"){
              await window.sb.auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token });
            }
          }catch(_e){}

          return { data: { session, user: session.user }, error: null };
        }

        window.sb.auth.signInWithPassword = async function(args){
          try{
            const res = await originalSignIn(args);
            if(res?.error && /failed to fetch/i.test(String(res.error.message || res.error))) throw res.error;
            return res;
          }catch(e){
            const msg = String(e?.message || e);
            if(/failed to fetch/i.test(msg)) return await signInViaFetch(args?.email, args?.password);
            return { data: { session: null, user: null }, error: e };
          }
        };

        window.sb.auth.__DOKE_AUTH_PATCHED__ = true;
        try{ console.info("[DOKE] Auth fallback ativo (signInWithPassword)."); }catch(_e){}
      }catch(_e){}
    })();
// Garantir que sessão persistida não fique "meio logada":
// - se o access_token expirou e não consegue refresh, limpa e força novo login
;(async () => {
  try {
    const { data } = await window.sb.auth.getSession();
    const session = data && data.session;
    if (!session) return;
    const expiresAtMs = session.expires_at ? session.expires_at * 1000 : 0;
    const needsRefresh = expiresAtMs && (expiresAtMs - Date.now() < 10 * 60 * 1000);
    if (needsRefresh && typeof window.sb.auth.refreshSession === "function") {
      const { error } = await window.sb.auth.refreshSession();
      if (error) {
        try { await window.sb.auth.signOut(); } catch(_e) {}
        try {
          const ref = (EXPECTED_REF || (new URL(DEFAULT_URL)).hostname.split(".")[0]);
          localStorage.removeItem(`sb-${ref}-auth-token`);
        } catch(_e) {}
      }
    }
  } catch(_e) {}
})();

// ============================================================
// Supabase health check (Auth + REST)
// - Diagnostica rapidamente casos de 520 (Cloudflare/origem indisponível)
// - Evita que páginas interpretem 520 como "CORS" ou "não logado"
// ============================================================
(function(){
  if (window.dokeSupabaseHealth) return;

  function showCorsBanner(details){
    try{
      if (typeof document === 'undefined') return;
      if (document.getElementById('doke-cors-banner')) return;
      const el = document.createElement('div');
      el.id = 'doke-cors-banner';
      el.setAttribute('role','alert');
      el.style.cssText = [
        'position:fixed','left:12px','right:12px','bottom:12px','z-index:2147483647',
        'padding:12px 14px','border-radius:12px','background:rgba(18,18,18,.96)','color:#fff',
        'box-shadow:0 10px 30px rgba(0,0,0,.35)','font:13px/1.35 system-ui,Segoe UI,Roboto,Arial',
        'max-width:920px','margin:0 auto'
      ].join(';');
      const origin = (typeof location !== 'undefined' && location.origin) ? location.origin : 'http://localhost:5500';
      el.innerHTML = `
        <div style="display:flex;gap:10px;align-items:flex-start;">
          <div style="flex:1;min-width:0;">
            <div style="font-weight:700;margin-bottom:6px;">Falha de rede ao falar com o Supabase</div>
            <div style="opacity:.92;">
              Você está em ambiente local. Para eliminar CORS, abra o site pelo <b>proxy local</b> (terminal rodando
              <code style="background:rgba(255,255,255,.08);padding:1px 6px;border-radius:6px;">node doke-devserver.js</code>)
              e confirme que
              <code style="background:rgba(255,255,255,.08);padding:1px 6px;border-radius:6px;">${origin}/__doke_proxy_ping</code>
              responde. Depois recarregue com <b>Ctrl+Shift+R</b>.
              <div style="margin-top:6px;opacity:.82;">Se ainda falhar, limpe o Local Storage (chaves <code style="background:rgba(255,255,255,.08);padding:1px 6px;border-radius:6px;">sb-*</code>) e tente novamente.</div>
            </div>
            ${details ? `<div style="margin-top:6px;opacity:.75;word-break:break-word;">Detalhe: ${String(details).slice(0,180)}</div>` : ''}
          </div>
          <button id="doke-cors-banner-close" style="background:rgba(255,255,255,.10);color:#fff;border:0;border-radius:10px;padding:8px 10px;cursor:pointer;">Fechar</button>
        </div>
      `;
      document.body.appendChild(el);
      const btn = document.getElementById('doke-cors-banner-close');
      if (btn) btn.onclick = () => { try{ el.remove(); }catch(_e){} };
    }catch(_e){}
  }

  function withTimeout(promise, ms){
    if(!ms) return promise;
    return Promise.race([
      promise,
      new Promise((_, rej)=> setTimeout(()=> rej(new Error('timeout')), ms))
    ]);
  }

  window.dokeSupabaseHealth = async function(timeoutMs){
    const url = window.SUPABASE_URL || window.DOKE_SUPABASE_URL;
    const key = window.SUPABASE_ANON_KEY || window.DOKE_SUPABASE_ANON_KEY;
    const out = {
      ts: Date.now(),
      url,
      authOk: false,
      restOk: false,
      authStatus: null,
      restStatus: null,
      authError: null,
      restError: null,
    };
    if(!url || !key) {
      out.authError = 'missing_config';
      out.restError = 'missing_config';
      window.DOKE_SUPABASE_HEALTH = out;
      return out;
    }

    // Auth health
    try{
      const r = await withTimeout(fetch(`${url}/auth/v1/health`, {
        headers: { apikey: key }
      }), timeoutMs || 3500);
      out.authStatus = r.status;
      out.authOk = r.status >= 200 && r.status < 500; // 5xx = indisponível
    }catch(e){
      out.authError = String(e?.message || e);
    }

    // REST ping (qualquer status != 520 indica que a origem respondeu)
    try{
      const r = await withTimeout(fetch(`${url}/rest/v1/usuarios?select=id&limit=1`, {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
        }
      }), timeoutMs || 3500);
      out.restStatus = r.status;
      out.restOk = r.status !== 520;
    }catch(e){
      out.restError = String(e?.message || e);
    }

    window.DOKE_SUPABASE_HEALTH = out;
    if(out.restStatus === 520 || (!out.restOk && out.restError)){
      console.warn('[DOKE] Supabase REST parece indisponível (520/erro de rede). Isso NÃO é bug de JS/CORS. Verifique se o projeto Supabase está pausado ou com o banco offline.', out);
    }

    // Se falhar em localhost com "Failed to fetch", quase sempre é CORS allowlist no Supabase.
    try{
      const local = /^(localhost|127\.0\.0\.1)$/i.test(String(location.hostname || ''));
      const e1 = String(out.restError || '').toLowerCase();
      const e2 = String(out.authError || '').toLowerCase();
      const looksLikeCors = (e1.includes('failed to fetch') || e2.includes('failed to fetch'));
      if (local && looksLikeCors) showCorsBanner(out.restError || out.authError);
    }catch(_e){}

    return out;
  };

  // Executa 1x sem bloquear o carregamento
  try{ window.dokeSupabaseHealth(); }catch(_e){}
})();
  }catch(e){
    warn("Falha ao criar cliente Supabase: " + (e && e.message ? e.message : e));
  }
})();

// Evita poluição do console por aborts transitórios do supabase-js (sem ocultar erros reais de app).
(function(){
  if (window.__dokeAbortRejectionGuard) return;
  window.__dokeAbortRejectionGuard = true;
  window.addEventListener("unhandledrejection", function(event){
    try{
      const reason = event && event.reason;
      const msg = String(reason?.message || reason || "").toLowerCase();
      const name = String(reason?.name || "").toLowerCase();
      const stack = String(reason?.stack || "").toLowerCase();
      const isSupabaseAbort =
        (name.includes("aborterror") || msg.includes("signal is aborted") || msg.includes("authretryablefetcherror")) &&
        (stack.includes("supabase.js") || msg.includes("failed to fetch"));
      if (isSupabaseAbort) {
        event.preventDefault();
      }
    }catch(_e){}
  });
})();

// ============================================================
// Legacy Firebase API shims (para não quebrar o script.js antigo)
// ============================================================
(function(){
  try{
    // onAuthStateChanged(auth, callback) (Firebase v9 style)
    if(typeof window.onAuthStateChanged !== "function"){
      window.onAuthStateChanged = function(_authObj, callback){
        try{
          const sb = window.sb || window.supabaseClient || window.supabase;
          if(sb && sb.auth){
            // callback imediato com usuário atual
            sb.auth.getSession()
              .then(({ data })=>{
                const u = data?.session?.user || null;
                callback(u ? { uid: u.id, email: u.email } : null);
              })
              .catch(()=> callback(null));

            // subscription
            const { data: sub } = sb.auth.onAuthStateChange((_event, session)=>{
              const u = session?.user || null;
              callback(u ? { uid: u.id, email: u.email } : null);
            });

            return function(){
              try{ sub?.subscription?.unsubscribe?.(); }catch(e){}
            };
          }
        }catch(e){}

        // fallback: sem auth
        setTimeout(()=>{ try{ callback(null); }catch(e){} }, 0);
        return function(){};
      };
    }

    // Evita ReferenceError em scripts antigos
    if(typeof window.initializeApp !== "function"){
      window.initializeApp = function(){ return {}; };
    }
  }catch(e){}
})();





/* ============================================================
   DOKE - DB Fallback Layer (Supabase-JS -> REST fetch)
   Objetivo: quando supabase-js falhar com "TypeError: Failed to fetch" (status 0),
   usar PostgREST via fetch (que já está funcionando no seu ambiente).
   Mantém window.sb.auth intacto.
============================================================ */
(function(){
  const w = window;

  function getCfg(){
    const url = (w.DOKE_SUPABASE_URL || w.SUPABASE_URL || localStorage.getItem("DOKE_SUPABASE_URL") || localStorage.getItem("SUPABASE_URL") || "").trim().replace(/\/+$/,'');
    const anon = (w.DOKE_SUPABASE_ANON_KEY || w.SUPABASE_ANON_KEY || localStorage.getItem("DOKE_SUPABASE_ANON_KEY") || localStorage.getItem("SUPABASE_ANON_KEY") || "").trim();
    return { url, anon };
  }

  async function getAuthToken(){
    try{
      const sb = w.sb;
      if(sb?.auth?.getSession){
        const { data } = await sb.auth.getSession();
        const token = data?.session?.access_token;
        if(token) return token;
      }
    }catch(_e){}
    return null;
  }

  async function restFetch({ table, method, query, body, preferReturn }){
    const { url, anon } = getCfg();
    if(!url || !anon) throw new Error("Supabase URL/ANON KEY ausentes.");
    const token = await getAuthToken();
    const headers = {
      apikey: anon,
      Authorization: `Bearer ${token || anon}`,
      "Accept-Profile": "public",
    };
    // Content-Profile só quando há body (POST/PATCH/DELETE) para evitar preflight "extra"
    if(body && method !== "GET") headers["Content-Profile"] = "public";
    if(preferReturn) headers["Prefer"] = "return=representation";
    const res = await fetch(`${url}/rest/v1/${encodeURIComponent(table)}${query ? `?${query}` : ""}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let data;
    try{ data = text ? JSON.parse(text) : null; }catch(_e){ data = text; }
    const out = { data: null, error: null, count: null, status: res.status, statusText: res.statusText };
    if(!res.ok){
      out.error = (typeof data === "object" && data) ? data : { message: String(data || res.statusText || "Request failed") };
      return out;
    }
    out.data = data;
    return out;
  }

  // Expor helper simples (pra debug e migração gradual)
  w.dokeRest = async function(table, query){
    return restFetch({ table, method:"GET", query }).then(r => {
      if(r.error) throw r.error;
      return r.data;
    });
  };

  function DokeQuery(table){
    this._table = table;
    this._method = "GET";
    this._select = null;
    this._filters = [];
    this._order = null;
    this._limit = null;
    this._offset = null;
    this._body = null;
    this._preferReturn = false;
    this._single = false;
  }

  const enc = (v) => encodeURIComponent(String(v));
  const add = function(qs){ this._filters.push(qs); return this; };

  DokeQuery.prototype.select = function(cols){
    this._select = (cols && String(cols).trim()) || "*";
    if(this._method !== "GET") this._preferReturn = true;
    return this;
  };
  DokeQuery.prototype.eq = function(col, val){ return add.call(this, `${enc(col)}=eq.${enc(val)}`); };
  DokeQuery.prototype.neq = function(col, val){ return add.call(this, `${enc(col)}=neq.${enc(val)}`); };
  DokeQuery.prototype.ilike = function(col, val){ return add.call(this, `${enc(col)}=ilike.${enc(val)}`); };
  DokeQuery.prototype.like = function(col, val){ return add.call(this, `${enc(col)}=like.${enc(val)}`); };
  DokeQuery.prototype.in = function(col, arr){
    const list = Array.isArray(arr) ? arr.map(v => `"${String(v).replace(/"/g,'\\"')}"`).join(",") : String(arr||"");
    return add.call(this, `${enc(col)}=in.(${enc(list)})`);
  };
  DokeQuery.prototype.order = function(col, opts){
    const asc = (opts && opts.ascending === false) ? "desc" : "asc";
    this._order = `${enc(col)}.${asc}`;
    return this;
  };
  DokeQuery.prototype.limit = function(n){ this._limit = Number(n); return this; };
  DokeQuery.prototype.range = function(from, to){
    this._offset = Number(from)||0;
    this._limit = (Number(to) - Number(from) + 1) || this._limit;
    return this;
  };
  DokeQuery.prototype.single = function(){ this._single = true; return this; };
  // maybeSingle(): igual ao single(), mas não trata 0 rows como erro.
  DokeQuery.prototype.maybeSingle = function(){ this._single = true; this._maybeSingle = true; return this; };

  DokeQuery.prototype.insert = function(payload){
    this._method = "POST";
    this._body = payload;
    return this;
  };
  DokeQuery.prototype.update = function(payload){
    this._method = "PATCH";
    this._body = payload;
    return this;
  };
  DokeQuery.prototype.delete = function(){
    this._method = "DELETE";
    return this;
  };

  DokeQuery.prototype._buildQuery = function(){
    const parts = [];
    if(this._select) parts.push(`select=${encodeURIComponent(this._select)}`);
    if(this._order) parts.push(`order=${this._order}`);
    if(this._limit != null) parts.push(`limit=${this._limit}`);
    if(this._offset != null) parts.push(`offset=${this._offset}`);
    if(this._filters.length) parts.push(...this._filters);
    return parts.join("&");
  };

  DokeQuery.prototype._exec = async function(){
    // tenta supabase-js primeiro (se existir e for DB op)
    const sb = w.sb;
    const canUseSb = sb && typeof sb.from === "function" && !sb.__DOKE_DB_PATCHED__;
    if(canUseSb){
      try{
        // executa o builder original
        let b = sb.from(this._table);
        if(this._method === "POST") b = b.insert(this._body);
        else if(this._method === "PATCH") b = b.update(this._body);
        else if(this._method === "DELETE") b = b.delete();

        if(this._select != null) b = b.select(this._select);
        for(const f of this._filters){
          // já está em string postgrest, não temos como reaplicar aqui com segurança
          // então pulamos e deixamos o fallback cuidar se precisar
        }
        if(this._order){
          const m = this._order.split(".");
          b = b.order(decodeURIComponent(m[0]), { ascending: (m[1] !== "desc") });
        }
        if(this._limit != null) b = b.limit(this._limit);
        if(this._offset != null && this._limit != null) b = b.range(this._offset, this._offset + this._limit - 1);
        if(this._single){
          if(this._maybeSingle && typeof b.maybeSingle === 'function') b = b.maybeSingle();
          else b = b.single();
        }

        const r = await b;
        // maybeSingle: ignora erro de "0 rows" (PostgREST)
        if(this._maybeSingle && r && r.error){
          const code = String(r.error.code || '');
          const msg  = String(r.error.message || '');
          // códigos comuns: PGRST116 (0 rows), ou mensagens equivalentes
          if(code === 'PGRST116' || /0\s*rows/i.test(msg) || /JSON object requested, multiple \(or no\) rows returned/i.test(msg)){
            return { data: null, error: null };
          }
        }
        // se supabase-js falhou por rede/cors, cai pro REST
        if(r && r.error && /failed to fetch/i.test(r.error.message || "")) throw r.error;
        return r;
      }catch(e){
        // cai pro REST
      }
    }

    const query = this._buildQuery();
    const r = await restFetch({
      table: this._table,
      method: this._method,
      query,
      body: this._body,
      preferReturn: this._preferReturn
    });
    // single()/maybeSingle(): transforma array em objeto
    if(this._single && Array.isArray(r.data)) r.data = r.data[0] || null;
    return r;
  };

  // thenable para usar: await window.sb.from(...).select(...).eq(...).limit(...)
  DokeQuery.prototype.then = function(resolve, reject){
    return this._exec().then(resolve, reject);
  };
  DokeQuery.prototype.catch = function(reject){
    return this._exec().catch(reject);
  };
  DokeQuery.prototype.finally = function(cb){
    return this._exec().finally(cb);
  };

  function patchClient(){
    if(!w.sb || typeof w.sb.from !== "function") return;
    if(w.sb.__DOKE_DB_PATCHED__) return;
    const original = w.sb.from.bind(w.sb);
    w.sb.__DOKE_DB_ORIGINAL_FROM__ = original;

    w.sb.from = function(table){
      // retorna query builder que tenta supabase-js e, se falhar, usa REST
      return new DokeQuery(table);
    };
    w.sb.__DOKE_DB_PATCHED__ = true;
    try{ console.info("[DOKE] DB fallback ativo (supabase-js -> REST)."); }catch(_e){}
  }

  // patch imediato + reforço após load
  patchClient();
  setTimeout(patchClient, 0);
  setTimeout(patchClient, 1000);
})();

