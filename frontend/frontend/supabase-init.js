/* DOKE â€” Supabase init (global)
   ------------------------------------------------------------
   1) Cole aqui o Project URL e a ANON PUBLIC KEY (JWT grande)
      Settings > API > Project URL
      Settings > API > Project API keys > anon public
   2) Este arquivo cria: window.sb (cliente Supabase)
*/
(function(){
  // Dev CORS helper: algumas allowlists de CORS incluem apenas localhost.
  // Se vocÃª estiver usando Live Server em 127.0.0.1, redireciona para localhost.
  // Ativo por padrÃ£o; para desativar, defina window.DOKE_FORCE_LOCALHOST_REDIRECT = false.
  try {
    if (window.DOKE_FORCE_LOCALHOST_REDIRECT !== false && typeof location !== 'undefined' && location.hostname === '127.0.0.1') {
      const to = String(location.href || '').replace('127.0.0.1', 'localhost');
      if (to && to !== location.href) { location.replace(to); return; }
    }
  } catch (_e) {}

  async function dokeFetchWithTimeout(resource, timeoutMs){
    const ms = Math.max(150, Number(timeoutMs) || 300);
    const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = setTimeout(() => {
      try { ctrl && ctrl.abort(); } catch(_e){}
    }, ms);
    try {
      const options = {
        method: "GET",
        cache: "no-store",
      };
      if (ctrl) options.signal = ctrl.signal;
      return await fetch(resource, options);
    } finally {
      clearTimeout(timer);
    }
  }

  function getLoopbackOriginVariants(origin){
    const out = [];
    const push = (value) => {
      const v = String(value || "").trim().replace(/\/+$/g, "");
      if (!v) return;
      if (!out.includes(v)) out.push(v);
    };
    push(origin);
    // Em ambiente local, forca prioridade estrita de mesma origem para evitar CORS cruzado
    // entre localhost/127.0.0.1 ou portas diferentes.
    return out;
  }

  async function hasProxyPing(origin, timeoutMs){
    const variants = getLoopbackOriginVariants(origin);
    for (const candidate of variants) {
      try{
        const res = await dokeFetchWithTimeout(`${candidate}/__doke_proxy_ping`, timeoutMs || 320);
        if (!res || !res.ok) continue;
        const data = await res.json().catch(() => null);
        if (data && data.ok) return true;
      }catch(_e){}
    }
    return false;
  }

  async function resolveReachableProxyOrigin(origin, timeoutMs){
    const variants = getLoopbackOriginVariants(origin);
    for (const candidate of variants) {
      if (await hasProxyPing(candidate, timeoutMs || 320)) return candidate;
    }
    return "";
  }

  async function hasProxyPixel(origin, timeoutMs){
    const ms = Math.max(180, Number(timeoutMs) || 320);
    return await new Promise((resolve) => {
      let done = false;
      const img = new Image();
      const finish = (ok) => {
        if (done) return;
        done = true;
        try {
          img.onload = null;
          img.onerror = null;
          img.src = "";
        } catch(_e){}
        clearTimeout(timer);
        resolve(!!ok);
      };
      const timer = setTimeout(() => finish(false), ms);
      img.onload = () => finish(true);
      img.onerror = () => finish(false);
      img.src = `${origin}/__doke_proxy_pixel.gif?ts=${Date.now()}`;
    });
  }

  function mapPathToProxy(pathname){
    let path = String(pathname || "/");
    if (!path.startsWith("/")) path = `/${path}`;
    if (path === "/") return "/frontend/index.html";
    if (/^\/frontend\//i.test(path)) return path;
    if (/^\/(?:__doke_proxy_ping|__doke_proxy_pixel\.gif)/i.test(path)) return path;
    return `/frontend${path}`;
  }

  async function maybeRedirectToProxyDevServer(){
    if (window.DOKE_NO_PROXY_REDIRECT) return false;
    if (typeof location === "undefined") return false;
    if (!/^(http:|https:)$/i.test(String(location.protocol || ""))) return false;
    if (!/^(localhost|127\.0\.0\.1)$/i.test(String(location.hostname || ""))) return false;

    const here = String(location.origin || "");
    if (!here) return false;

    const currentProxyOrigin = await resolveReachableProxyOrigin(here, 220);
    if (currentProxyOrigin) {
      try { sessionStorage.setItem("DOKE_PROXY_ORIGIN", here); } catch(_e){}
      return false;
    }

    const candidates = [];
    const pushCandidate = (o) => {
      const v = String(o || "").trim().replace(/\/+$/g, "");
      if (!v || v === here) return;
      if (!/^https?:\/\/(localhost|127\.0\.0\.1):\d+$/i.test(v)) return;
      if (!candidates.includes(v)) candidates.push(v);
    };

    const hostA = String(location.hostname || "").toLowerCase() === "127.0.0.1" ? "127.0.0.1" : "localhost";
    const hostB = hostA === "localhost" ? "127.0.0.1" : "localhost";
    const ports = [5500, 5501, 5502, 5503, 5504, 5505, 5506, 5507, 5508, 5509, 5510];
    for (const p of ports) {
      pushCandidate(`http://${hostA}:${p}`);
    }
    for (const p of ports) {
      pushCandidate(`http://${hostB}:${p}`);
    }

    let proxyOrigin = "";
    for (const candidate of candidates) {
      if (await hasProxyPing(candidate, 220) || await hasProxyPixel(candidate, 300)) {
        proxyOrigin = candidate;
        break;
      }
    }
    if (!proxyOrigin) return false;

    try { sessionStorage.setItem("DOKE_PROXY_ORIGIN", proxyOrigin); } catch(_e){}

    const targetPath = mapPathToProxy(location.pathname);
    const to = `${proxyOrigin}${targetPath}${location.search || ""}${location.hash || ""}`;
    if (to && to !== location.href) {
      location.replace(to);
      return true;
    }
    return false;
  }

  try {
    // Redirecionamento para proxy em modo "best effort" sem bloquear init.
    // Isso evita race-condition com scripts que dependem de window.sb logo apÃ³s este arquivo.
    maybeRedirectToProxyDevServer().catch(() => {});
  } catch (_e) {}
  // Evita recriar o cliente em hot-reload / mÃºltiplos scripts
  if (window.sb && typeof window.sb.from === "function") {
    console.log("[DOKE] Supabase jÃ¡ inicializado (global).");
    return;
  }
  const DEFAULT_URL = "https://wgbnoqjnvhasapqarltu.supabase.co";
  const DEFAULT_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndnYm5vcWpudmhhc2FwcWFybHR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwODEwMzgsImV4cCI6MjA4MzY1NzAzOH0.qZZQJ7To8EYe5eELG2DzwU9Vh0gn6tAkAbCLmns8ScQ";

  let localUrl = "";
  let localKey = "";
  const isLocalDev =
    typeof location !== "undefined" &&
    /^(localhost|127\.0\.0\.1)$/i.test(String(location.hostname || ""));
  try {
    localUrl = localStorage.getItem("DOKE_SUPABASE_URL") || "";
    localKey = localStorage.getItem("DOKE_SUPABASE_ANON_KEY") || "";
  } catch (_e) {}

  function hasProxyPingSync(origin){
    if (typeof XMLHttpRequest === "undefined") return false;
    const variants = getLoopbackOriginVariants(origin);
    for (const candidate of variants) {
      try {
        const xhr = new XMLHttpRequest();
        xhr.open("GET", `${candidate}/__doke_proxy_ping`, false);
        xhr.send(null);
        if (xhr.status < 200 || xhr.status >= 300) continue;
        const raw = String(xhr.responseText || "").trim();
        if (!raw) continue;
        const payload = JSON.parse(raw);
        if (payload && payload.ok === true) return true;
      } catch (_e) {}
    }
    return false;
  }

  function resolveReachableProxyOriginSync(origin){
    if (typeof XMLHttpRequest === "undefined") return "";
    const variants = getLoopbackOriginVariants(origin);
    for (const candidate of variants) {
      try {
        const xhr = new XMLHttpRequest();
        xhr.open("GET", `${candidate}/__doke_proxy_ping`, false);
        xhr.send(null);
        if (xhr.status < 200 || xhr.status >= 300) continue;
        const raw = String(xhr.responseText || "").trim();
        if (!raw) continue;
        const payload = JSON.parse(raw);
        if (payload && payload.ok === true) return candidate;
      } catch (_e) {}
    }
    return "";
  }

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

  // Se existir URL/KEY antigos no localStorage (de outro projeto), isso pode gerar CORS e pÃ¡ginas que â€œquebramâ€ sÃ³ quando loga.
  // Aqui a gente mantÃ©m override apenas se for explÃ­cito (window.DOKE_SUPABASE_URL / window.SUPABASE_URL).
  const EXPECTED_REF = (function(){
    try { return (new URL(DEFAULT_URL)).hostname.split(".")[0]; } catch(_e){ return ""; }
  })();
  const DOKE_AUTH_STORAGE_KEY = EXPECTED_REF ? `sb-${EXPECTED_REF}-auth-token` : "sb-doke-auth-token";

  function decodeJwtPayload(token){
    try {
      const parts = String(token || "").split(".");
      if (parts.length < 2) return null;
      const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const pad = "=".repeat((4 - (b64.length % 4)) % 4);
      const json = atob(b64 + pad);
      return JSON.parse(json);
    } catch (_e) {
      return null;
    }
  }

  function tokenBelongsToExpectedProject(token){
    if (!EXPECTED_REF) return false;
    const payload = decodeJwtPayload(token);
    if (!payload || !payload.iss) return false;
    return String(payload.iss).toLowerCase().includes(`https://${EXPECTED_REF}.supabase.co/auth/v1`);
  }

  function migrateLegacyAuthTokenStorageKey(){
    try {
      if (!DOKE_AUTH_STORAGE_KEY || !EXPECTED_REF) return;
      const already = localStorage.getItem(DOKE_AUTH_STORAGE_KEY);
      if (already) return;
      const keys = Object.keys(localStorage).filter((k) =>
        /^sb-[a-z0-9-]+-auth-token$/i.test(k) && k !== DOKE_AUTH_STORAGE_KEY
      );
      for (const k of keys) {
        const raw = localStorage.getItem(k);
        if (!raw) continue;
        let session = null;
        try { session = JSON.parse(raw); } catch (_e) { session = null; }
        const accessToken = session && typeof session === "object" ? session.access_token : null;
        if (!accessToken || !tokenBelongsToExpectedProject(accessToken)) continue;
        localStorage.setItem(DOKE_AUTH_STORAGE_KEY, raw);
        break;
      }
    } catch (_e) {}
  }

  try { migrateLegacyAuthTokenStorageKey(); } catch (_e) {}

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

  const proxyOriginOnThisOrigin = (
    isLocalDev &&
    typeof location !== "undefined"
  ) ? resolveReachableProxyOriginSync(location.origin) : "";
  const proxyActiveOnThisOrigin = !!proxyOriginOnThisOrigin;
  let usingLocalProxy = proxyActiveOnThisOrigin;

  // Se o devserver local estiver ativo na origem atual, usa proxy same-origin
  // para eliminar CORS de forma determinÃ­stica.
  if (proxyActiveOnThisOrigin && typeof location !== "undefined") {
    try {
      window.DOKE_SUPABASE_PROXY_ENABLED = true;
      window.DOKE_SUPABASE_PROXY_UPSTREAM = url;
      window.DOKE_SUPABASE_PROXY_ORIGIN = location.origin;
      url = window.DOKE_SUPABASE_PROXY_ORIGIN;
    } catch (_e) {}
  }

  // Reescreve fetch absoluto para a origem local quando proxy estÃ¡ ativo.
  try {
    if (
      usingLocalProxy &&
      typeof window !== "undefined" &&
      typeof window.fetch === "function" &&
      !window.fetch.__DOKE_PROXY_REWRITE__
    ) {
      const upstreamHost = (new URL(window.DOKE_SUPABASE_PROXY_UPSTREAM || DEFAULT_URL)).host;
      const originalFetch = window.fetch.bind(window);
      const REST_BACKOFF_KEY = "__DOKE_FETCH_REST_BACKOFF_UNTIL__";
      const REST_BACKOFF_MS = 20000;
      window.fetch = function(input, init){
        const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        const getUrlString = (target) => {
          try{
            if(typeof target === "string") return target;
            if(typeof URL !== "undefined" && target instanceof URL) return target.toString();
            if(typeof Request !== "undefined" && target instanceof Request) return target.url || "";
          }catch(_){}
          return "";
        };
        const shouldRetry = (target) => {
          try{
            const parsed = new URL(getUrlString(target), location.origin);
            return parsed.origin === location.origin && /^\/(rest|auth|storage|functions)\/v1\//i.test(parsed.pathname || "");
          }catch(_){
            return false;
          }
        };
        const isRestRequest = (target) => {
          try{
            const parsed = new URL(getUrlString(target), location.origin);
            return parsed.origin === location.origin && /^\/rest\/v1\//i.test(parsed.pathname || "");
          }catch(_){
            return false;
          }
        };
        const getBackoffUntil = () => {
          try { return Number(window[REST_BACKOFF_KEY] || 0) || 0; } catch(_) { return 0; }
        };
        const markBackoff = () => {
          try { window[REST_BACKOFF_KEY] = Date.now() + REST_BACKOFF_MS; } catch(_){}
        };
        try {
          if (typeof input === "string") {
            const u = new URL(input, location.origin);
            if (u.host === upstreamHost) input = u.pathname + u.search + u.hash;
          } else if (typeof URL !== "undefined" && input instanceof URL) {
            if (input.host === upstreamHost) input = input.pathname + input.search + input.hash;
          } else if (typeof Request !== "undefined" && input instanceof Request) {
            const u = new URL(input.url, location.origin);
            if (u.host === upstreamHost) {
              const nextUrl = u.pathname + u.search + u.hash;
              try {
                const cloned = input.clone();
                input = new Request(nextUrl, cloned);
              } catch (_e2) {
                input = new Request(nextUrl, input);
              }
            }
          }
        } catch (_e) {}
        const retryable = shouldRetry(input) && (window.DOKE_ENABLE_FETCH_RETRY === true);
        const restRequest = isRestRequest(input);
        return (async () => {
          try{
            if(restRequest && getBackoffUntil() > Date.now()){
              return new Response(JSON.stringify({ message: "rest_backoff_active", status: 520 }), {
                status: 520,
                headers: { "content-type": "application/json; charset=utf-8" }
              });
            }
            const res = await originalFetch(input, init);
            if(restRequest && res.status === 520){
              markBackoff();
            }
            if(retryable && (res.status === 520 || res.status === 502 || res.status === 503 || res.status === 504)){
              await sleep(140);
              return await originalFetch(input, init);
            }
            return res;
          }catch(err){
            const msg = String(err?.message || err || "").toLowerCase();
            const isNet = msg.includes("failed to fetch") || msg.includes("networkerror") || msg.includes("load failed") || msg.includes("connection reset");
            if(restRequest && isNet){
              markBackoff();
            }
            if(retryable && isNet){
              await sleep(140);
              return await originalFetch(input, init);
            }
            throw err;
          }
        })();
      };
      window.fetch.__DOKE_PROXY_REWRITE__ = true;
    }
  } catch (_e) {}

  
const rawKey =
  window.DOKE_SUPABASE_ANON_KEY ||
  window.SUPABASE_ANON_KEY ||
  localKey ||
  DEFAULT_KEY;

const keyCandidate = normalizeSupabaseKey(rawKey);
const key = /^eyJ[a-zA-Z0-9._-]+$/.test(keyCandidate) ? keyCandidate : DEFAULT_KEY;

  // ExpÃµe configuraÃ§Ã£o normalizada para scripts legados.
  window.SUPABASE_URL = url;
  window.SUPABASE_ANON_KEY = key;
  window.DOKE_SUPABASE_URL = url;
  window.DOKE_SUPABASE_ANON_KEY = key;

  // Higieniza chaves legadas para evitar criaÃ§Ã£o de cliente com URL antiga/corrompida.
  try {
    const persistedUrl = usingLocalProxy ? DEFAULT_URL : url;
    localStorage.setItem("DOKE_SUPABASE_URL", persistedUrl);
    localStorage.setItem("SUPABASE_URL", persistedUrl);
    localStorage.setItem("supabase_url", persistedUrl);
    localStorage.setItem("DOKE_SUPABASE_ANON_KEY", key);
    localStorage.setItem("SUPABASE_ANON_KEY", key);
    localStorage.setItem("supabase_anon_key", key);
    const refBase = usingLocalProxy ? DEFAULT_URL : url;
    const ref = (new URL(refBase)).hostname.split(".")[0];
    Object.keys(localStorage).forEach((k) => {
      if (!/^sb-[a-z0-9]+-auth-token$/i.test(k)) return;
      if (!k.startsWith(`sb-${ref}-`)) {
        localStorage.removeItem(k);
      }
    });
  } catch (_e) {}
  
  function warn(msg){ console.warn("[DOKE]", msg); }

  if (!window.supabase || !window.supabase.createClient) {
    warn("Biblioteca Supabase nÃ£o carregada. Confira o <script src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'>");
    return;
  }

  if (!/^https?:\/\//i.test(url) || url.includes("YOURPROJECT")) {
    warn("SUPABASE_URL invÃ¡lida ou nÃ£o configurada. Edite supabase-init.js.");
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
      // IMPORTANT:
      // NUNCA force "Content-Profile" globalmente.
      // Alguns setups de CORS/proxy bloqueiam esse header em requests GET,
      // causando "TypeError: Failed to fetch" (status 0) no supabase-js.
      // O supabase-js jÃ¡ envia Accept-Profile/Content-Profile apenas quando necessÃ¡rio
      // baseado em db.schema.
      auth: {
        persistSession: true,
        storageKey: DOKE_AUTH_STORAGE_KEY,
        // Evita enxurrada de refresh_token em ambientes com CORS/rede instÃ¡vel.
        autoRefreshToken: true,
        detectSessionInUrl: true,
      }
    });
    const supabaseNamespace = (window.supabase && typeof window.supabase.createClient === "function") ? window.supabase : null;
    window.supabaseClient = window.sb;
    window.__supabaseClient = window.sb;
    window.client = window.sb;
    window.getSupabaseClient = function(){
      return window.sb || window.supabaseClient || window.__supabaseClient || null;
    };
    if (!window.supabase || typeof window.supabase.from !== "function") {
      if (typeof Proxy === "function" && supabaseNamespace) {
        window.supabase = new Proxy(window.sb, {
          get(target, prop, receiver) {
            if (prop in target) {
              const v = Reflect.get(target, prop, receiver);
              return typeof v === "function" ? v.bind(target) : v;
            }
            if (prop in supabaseNamespace) {
              const nsVal = supabaseNamespace[prop];
              return typeof nsVal === "function" ? nsVal.bind(supabaseNamespace) : nsVal;
            }
            return undefined;
          },
        });
      } else {
        window.supabase = window.sb;
      }
    }
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
          try {
            const upstream = window.DOKE_SUPABASE_PROXY_UPSTREAM || DEFAULT_URL || url;
            return (new URL(upstream)).hostname.split(".")[0];
          } catch(_e){ return null; }
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
// Garantir que sessÃ£o persistida nÃ£o fique "meio logada":
// - se o access_token expirou e nÃ£o consegue refresh, limpa e forÃ§a novo login
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
          const upstream = window.DOKE_SUPABASE_PROXY_UPSTREAM || DEFAULT_URL || url;
          const ref = (new URL(upstream)).hostname.split(".")[0];
          localStorage.removeItem(`sb-${ref}-auth-token`);
        } catch(_e) {}
      }
    }
  } catch(_e) {}
})();

// ============================================================
// Supabase health check (Auth + REST)
// - Diagnostica rapidamente casos de 520 (Cloudflare/origem indisponÃ­vel)
// - Evita que pÃ¡ginas interpretem 520 como "CORS" ou "nÃ£o logado"
// ============================================================
(function(){
  if (window.dokeSupabaseHealth) return;

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
      out.authOk = r.status >= 200 && r.status < 500; // 5xx = indisponÃ­vel
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
      console.warn('[DOKE] Supabase REST parece indisponÃ­vel (520/erro de rede). Isso NÃƒO Ã© bug de JS/CORS. Verifique se o projeto Supabase estÃ¡ pausado ou com o banco offline.', out);
    }
    return out;
  };

  // Executa 1x sem bloquear o carregamento
  try{ window.dokeSupabaseHealth(); }catch(_e){}
})();
  }catch(e){
    warn("Falha ao criar cliente Supabase: " + (e && e.message ? e.message : e));
  }
})();

// Evita poluiÃ§Ã£o do console por aborts transitÃ³rios do supabase-js (sem ocultar erros reais de app).
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
// Legacy Firebase API shims (para nÃ£o quebrar o script.js antigo)
// ============================================================
(function(){
  try{
    // onAuthStateChanged(auth, callback) (Firebase v9 style)
    if(typeof window.onAuthStateChanged !== "function"){
      window.onAuthStateChanged = function(_authObj, callback){
        try{
          const sb = window.sb || window.supabaseClient || window.supabase;
          if(sb && sb.auth){
            // callback imediato com usuÃ¡rio atual
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
   usar PostgREST via fetch (que jÃ¡ estÃ¡ funcionando no seu ambiente).
   MantÃ©m window.sb.auth intacto.
============================================================ */
(function(){
  const w = window;
  if (!w.DOKE_ENABLE_DB_FALLBACK) return;

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
    // IMPORTANTE (CORS): evite headers nÃ£o-padrÃ£o (ex.: Accept-Profile/Content-Profile)
    // porque eles forÃ§am preflight com Access-Control-Request-Headers adicionais e,
    // em alguns ambientes, o gateway do Supabase nÃ£o responde com allow-headers completo.
    // Para o schema padrÃ£o "public" nÃ£o precisamos desses headers.
    const headers = {
      apikey: anon,
      Authorization: `Bearer ${token || anon}`,
    };

    // SÃ³ adiciona Content-Type quando existe body (isso jÃ¡ Ã© suficiente para PostgREST)
    if(body && method !== "GET") headers["Content-Type"] = "application/json";
    if(preferReturn) headers["Prefer"] = "return=representation";
    let res;
    try {
      res = await fetch(`${url}/rest/v1/${encodeURIComponent(table)}${query ? `?${query}` : ""}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (e) {
      return {
        data: null,
        error: { message: String(e?.message || e || "Failed to fetch") },
        count: null,
        status: 0,
        statusText: "NETWORK_ERROR",
      };
    }
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

  // Expor helper simples (pra debug e migraÃ§Ã£o gradual)
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
  // maybeSingle(): igual ao single(), mas nÃ£o trata 0 rows como erro.
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
          // jÃ¡ estÃ¡ em string postgrest, nÃ£o temos como reaplicar aqui com seguranÃ§a
          // entÃ£o pulamos e deixamos o fallback cuidar se precisar
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
          // cÃ³digos comuns: PGRST116 (0 rows), ou mensagens equivalentes
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

  // patch imediato + reforÃ§o apÃ³s load
  patchClient();
  setTimeout(patchClient, 0);
  setTimeout(patchClient, 1000);
})();
