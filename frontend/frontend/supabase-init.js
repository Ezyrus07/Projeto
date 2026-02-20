/* DOKE â€” Supabase init (global)
   ------------------------------------------------------------
   1) Cole aqui o Project URL e a ANON PUBLIC KEY (JWT grande)
      Settings > API > Project URL
      Settings > API > Project API keys > anon public
   2) Este arquivo cria: window.sb (cliente Supabase)
*/
(function(){
  window.__DOKE_SUPABASE_BUILD__ = "20260218v43";
  try { console.log("[DOKE] supabase-init build:", window.__DOKE_SUPABASE_BUILD__); } catch(_e) {}

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

  const DOKE_LOCAL_PROXY_PORTS = [5500, 5501, 5502, 5503, 5504, 5505, 5506, 5507, 5508, 5509, 5510];
  const DOKE_PROXY_ORIGIN_KEY = "DOKE_PROXY_ORIGIN";
  const DOKE_PROXY_ORIGIN_SHARED_KEY = "DOKE_PROXY_ORIGIN_SHARED";

  function readSavedProxyOrigin(){
    try {
      const local = localStorage.getItem(DOKE_PROXY_ORIGIN_SHARED_KEY);
      if (local) return local;
    } catch(_e){}
    try {
      const tab = sessionStorage.getItem(DOKE_PROXY_ORIGIN_KEY);
      if (tab) return tab;
    } catch(_e){}
    return "";
  }

  function saveProxyOrigin(origin){
    const value = String(origin || "").trim().replace(/\/+$/g, "");
    if (!value) return;
    try { sessionStorage.setItem(DOKE_PROXY_ORIGIN_KEY, value); } catch(_e){}
    try { localStorage.setItem(DOKE_PROXY_ORIGIN_SHARED_KEY, value); } catch(_e){}
  }

  function buildLoopbackProxyCandidates(origin, includeKnownPorts){
    const out = [];
    const push = (value) => {
      const v = String(value || "").trim().replace(/\/+$/g, "");
      if (!v) return;
      if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(v)) return;
      if (!out.includes(v)) out.push(v);
    };

    push(origin);
    push(readSavedProxyOrigin());

    if (!includeKnownPorts) return out;

    let protocol = "http:";
    let hostA = "localhost";
    try {
      const parsed = new URL(String(origin || "http://localhost"));
      if (/^https?:$/i.test(parsed.protocol)) protocol = parsed.protocol;
      hostA = String(parsed.hostname || "").toLowerCase() === "127.0.0.1" ? "127.0.0.1" : "localhost";
    } catch(_e){}
    const hostB = hostA === "localhost" ? "127.0.0.1" : "localhost";

    for (const p of DOKE_LOCAL_PROXY_PORTS) push(`${protocol}//${hostA}:${p}`);
    for (const p of DOKE_LOCAL_PROXY_PORTS) push(`${protocol}//${hostB}:${p}`);
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

    // Mantem uma origem local canonica entre abas/paginas para não quebrar sessao.
    // Ex.: evita abrir :5508 quando a sessao ativa esta em :5502.
    try {
      if (window.DOKE_PREFER_SAVED_PROXY_ORIGIN !== false) {
        const saved = String(readSavedProxyOrigin() || "").trim().replace(/\/+$/g, "");
        if (saved && saved !== here && /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/i.test(saved)) {
          const savedReachable = await resolveReachableProxyOrigin(saved, 220);
          if (savedReachable === saved) {
            const targetPath = mapPathToProxy(location.pathname);
            const to = `${saved}${targetPath}${location.search || ""}${location.hash || ""}`;
            if (to && to !== location.href) {
              location.replace(to);
              return true;
            }
          }
        }
      }
    } catch (_e) {}

    const currentProxyOrigin = await resolveReachableProxyOrigin(here, 220);
    if (currentProxyOrigin) {
      saveProxyOrigin(here);
      return false;
    }
    // IMPORTANTE:
    // Não faça redirect automático para outra porta/origem local por padrão.
    // Isso separa localStorage/sessão entre origens e causa "deslogado fantasma"
    // ao navegar entre páginas (ex.: index em :5502 e chat/perfil em :5501).
    if (window.DOKE_ALLOW_CROSS_PORT_REDIRECT !== true) return false;

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

    saveProxyOrigin(proxyOrigin);

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

  function resolveReachableProxyOriginSyncAcrossLocal(origin){
    if (typeof XMLHttpRequest === "undefined") return "";
    const candidates = buildLoopbackProxyCandidates(origin, true);
    for (const candidate of candidates) {
      if (hasProxyPingSync(candidate)) return candidate;
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
  const DOKE_SESSION_BACKUP_KEY = "doke_auth_session_backup";
  const DOKE_DEV_SESSION_COOKIE = "doke_dev_session";

  function readCookie(name){
    try {
      const needle = `${name}=`;
      const parts = String(document.cookie || "").split(";");
      for (const p of parts) {
        const item = String(p || "").trim();
        if (item.startsWith(needle)) return decodeURIComponent(item.slice(needle.length));
      }
    } catch (_e) {}
    return "";
  }

  function writeDevSessionCookie(session){
    try {
      if (!isLocalDev || !session?.access_token || !session?.refresh_token) return;
      const payload = {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at || null
      };
      const raw = encodeURIComponent(JSON.stringify(payload));
      document.cookie = `${DOKE_DEV_SESSION_COOKIE}=${raw}; path=/; max-age=${60 * 60 * 24 * 14}; samesite=lax`;
    } catch (_e) {}
  }

  function clearDevSessionCookie(){
    try {
      document.cookie = `${DOKE_DEV_SESSION_COOKIE}=; path=/; max-age=0; samesite=lax`;
    } catch (_e) {}
  }

  function looksLikeUnauthorizedSessionError(err){
    try {
      const status = Number(err?.status || err?.code || 0);
      const msg = String(
        err?.message ||
        err?.error_description ||
        err?.hint ||
        err?.details ||
        err ||
        ""
      ).toLowerCase();
      if (status === 400 || status === 401 || status === 403) return true;
      if (!msg) return false;
      return (
        msg.includes("unauthorized") ||
        msg.includes("invalid grant") ||
        msg.includes("invalid_grant") ||
        msg.includes("invalid refresh") ||
        msg.includes("refresh token") ||
        msg.includes("jwt")
      );
    } catch (_e) {
      return false;
    }
  }

  async function clearInvalidSessionArtifacts(reason){
    try { console.warn("[DOKE] Limpando sessao invalida:", reason || "unknown"); } catch (_e) {}
    try { localStorage.removeItem(DOKE_AUTH_STORAGE_KEY); } catch (_e) {}
    try { localStorage.removeItem(DOKE_SESSION_BACKUP_KEY); } catch (_e) {}
    try { localStorage.removeItem("usuarioLogado"); } catch (_e) {}
    try { localStorage.removeItem("doke_uid"); } catch (_e) {}
    try { localStorage.removeItem("doke_usuario_perfil"); } catch (_e) {}
    try { clearDevSessionCookie(); } catch (_e) {}
    try {
      const keys = Object.keys(localStorage).filter((k) => /^sb-[a-z0-9-]+-auth-token$/i.test(k));
      keys.forEach((k) => {
        try { localStorage.removeItem(k); } catch (_e2) {}
      });
    } catch (_e) {}

    try {
      const authApi = window.sb?.auth;
      if (authApi && typeof authApi.signOut === "function") {
        const prevForce = window.DOKE_FORCE_SIGNOUT;
        window.DOKE_FORCE_SIGNOUT = true;
        try { await authApi.signOut({ scope: "local" }); } catch (_e) {}
        window.DOKE_FORCE_SIGNOUT = prevForce;
      }
    } catch (_e) {}
  }

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

  function buildAuthUserFromToken(token, fallbackUser){
    try {
      const raw = String(token || "").trim();
      if (!raw) return null;
      const payload = decodeJwtPayload(raw);
      const uid = String(payload?.sub || "").trim();
      if (!uid) return null;
      const baseMeta = (fallbackUser && typeof fallbackUser === "object" ? (fallbackUser.user_metadata || {}) : {}) || {};
      return {
        id: uid,
        uid: uid,
        email: fallbackUser?.email || payload?.email || null,
        user_metadata: {
          ...baseMeta
        }
      };
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

  function getSessionTokenExpiryMs(sessionLike){
    try {
      const token = String(sessionLike?.access_token || "").trim();
      const payload = decodeJwtPayload(token);
      const expFromJwt = Number(payload?.exp || 0);
      if (expFromJwt) return expFromJwt * 1000;

      const rawExpiresAt = Number(sessionLike?.expires_at || 0);
      if (rawExpiresAt > 0) {
        // Supabase pode retornar em segundos; normaliza para ms.
        return rawExpiresAt > 10000000000 ? rawExpiresAt : (rawExpiresAt * 1000);
      }
    } catch (_e) {}
    return 0;
  }

  function isSessionAccessTokenFresh(sessionLike, skewMs){
    const token = String(sessionLike?.access_token || "").trim();
    if (!token) return false;
    const expMs = getSessionTokenExpiryMs(sessionLike);
    if (!expMs) return true;
    const skew = Math.max(5000, Number(skewMs) || 15000);
    return expMs > (Date.now() + skew);
  }

  function extractSessionCandidate(rawSessionLike){
    let source = rawSessionLike;
    if (typeof source === "string") {
      try { source = JSON.parse(source); } catch (_e) { source = null; }
      if (typeof source === "string") {
        try { source = JSON.parse(source); } catch (_e2) { source = null; }
      }
    }
    if (!source || typeof source !== "object") return null;
    const bag = [
      source,
      source.currentSession,
      source.session,
      source.data?.session,
      source.currentSession?.session,
      source.data
    ].filter(Boolean);

    for (const candidate of bag) {
      if (!candidate || typeof candidate !== "object") continue;
      const accessToken = String(candidate.access_token || candidate.accessToken || "").trim();
      const refreshToken = String(
        candidate.refresh_token ||
        candidate.refreshToken ||
        source.refresh_token ||
        source.refreshToken ||
        ""
      ).trim();
      if (!accessToken) continue;
      if (!tokenBelongsToExpectedProject(accessToken)) continue;
      return {
        access_token: accessToken,
        refresh_token: refreshToken || null,
        token_type: candidate.token_type || source.token_type || "bearer",
        expires_at: candidate.expires_at || source.expires_at || null,
        expires_in: candidate.expires_in || source.expires_in || null,
        user: candidate.user || source.user || null
      };
    }
    return null;
  }

  function findStoredSessionCandidate(preferCanonical, opts){
    const requireRefreshToken = !!(opts && opts.requireRefreshToken === true);
    const allowExpiredAccessToken = !!(opts && opts.allowExpiredAccessToken === true);
    try {
      const keys = Object.keys(localStorage).filter((k) => /^sb-[a-z0-9-]+-auth-token$/i.test(k));
      if (!keys.length) return null;
      if (preferCanonical && DOKE_AUTH_STORAGE_KEY && keys.includes(DOKE_AUTH_STORAGE_KEY)) {
        keys.splice(keys.indexOf(DOKE_AUTH_STORAGE_KEY), 1);
        keys.unshift(DOKE_AUTH_STORAGE_KEY);
      }
      for (const k of keys) {
        const raw = localStorage.getItem(k);
        if (!raw) continue;
        let parsed = null;
        try { parsed = JSON.parse(raw); } catch (_e) { parsed = null; }
        if (!parsed || typeof parsed !== "object") continue;
        const session = extractSessionCandidate(parsed);
        if (!session || !session.access_token) continue;
        if (requireRefreshToken && !session.refresh_token) continue;
        if (!allowExpiredAccessToken && !isSessionAccessTokenFresh(session, 15000)) continue;
        return { key: k, session, raw: parsed };
      }
    } catch (_e) {}

    try {
      const backupRaw = localStorage.getItem(DOKE_SESSION_BACKUP_KEY);
      if (backupRaw) {
        let parsed = null;
        try { parsed = JSON.parse(backupRaw); } catch (_e) { parsed = null; }
        const session = extractSessionCandidate(parsed || {});
        if (requireRefreshToken && !session?.refresh_token) {
          // tenta cookie na etapa seguinte
        } else
        if (!allowExpiredAccessToken && !isSessionAccessTokenFresh(session, 15000)) {
          // tenta cookie na etapa seguinte
        } else
        if (session?.access_token) return { key: DOKE_SESSION_BACKUP_KEY, session, raw: parsed };
      }
    } catch (_e) {}

    try {
      if (isLocalDev) {
        const cookieRaw = readCookie(DOKE_DEV_SESSION_COOKIE);
        if (cookieRaw) {
          let parsed = null;
          try { parsed = JSON.parse(cookieRaw); } catch (_e) { parsed = null; }
          const session = extractSessionCandidate(parsed || {});
          if (requireRefreshToken && !session?.refresh_token) {
            // sem refresh no cookie; ignora
          } else
          if (!allowExpiredAccessToken && !isSessionAccessTokenFresh(session, 15000)) {
            // token expirado; ignora
          } else
          if (session?.access_token) return { key: DOKE_DEV_SESSION_COOKIE, session, raw: parsed };
        }
      }
    } catch (_e) {}
    return null;
  }

  function persistSessionArtifacts(session){
    try {
      if (!session || typeof session !== "object") return false;
      const accessToken = String(session.access_token || "").trim();
      if (!accessToken) return false;
      try { localStorage.setItem(DOKE_AUTH_STORAGE_KEY, JSON.stringify(session)); } catch (_e) {}
      try { localStorage.setItem(DOKE_SESSION_BACKUP_KEY, JSON.stringify(session)); } catch (_e) {}
      try { writeDevSessionCookie(session); } catch (_e) {}
      try {
        const uidFromUser = String(session?.user?.id || "").trim();
        const payload = decodeJwtPayload(accessToken);
        const uid = uidFromUser || String(payload?.sub || "").trim();
        if (uid) {
          localStorage.setItem("usuarioLogado", "true");
          localStorage.setItem("doke_uid", uid);
        }
      } catch (_e) {}
      return true;
    } catch (_e) {
      return false;
    }
  }

  function normalizeSessionFromAuthPayload(payload, fallbackRefreshToken){
    if (!payload || typeof payload !== "object") return null;
    const accessToken = String(payload.access_token || "").trim();
    const refreshToken = String(payload.refresh_token || fallbackRefreshToken || "").trim();
    if (!accessToken || !refreshToken) return null;
    const expiresIn = Number(payload.expires_in || 0);
    const expiresAt = payload.expires_at
      ? Number(payload.expires_at)
      : (expiresIn ? Math.floor(Date.now() / 1000) + expiresIn : null);
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: payload.token_type || "bearer",
      expires_in: expiresIn || null,
      expires_at: expiresAt || null,
      user: payload.user || null
    };
  }

  async function refreshSessionViaAuthRest(refreshToken){
    const rt = String(refreshToken || "").trim();
    if (!rt) return null;
    try { window.__DOKE_LAST_REFRESH_AUTH_ERROR__ = null; } catch (_e) {}
    const origins = [];
    const pushOrigin = (value) => {
      const raw = String(value || "").trim().replace(/\/+$/g, "");
      if (!raw) return;
      if (!/^https?:\/\//i.test(raw)) return;
      if (!origins.includes(raw)) origins.push(raw);
    };
    pushOrigin(url);
    pushOrigin(window.DOKE_SUPABASE_PROXY_ORIGIN);
    pushOrigin(window.DOKE_SUPABASE_PROXY_UPSTREAM);
    pushOrigin(DEFAULT_URL);

    for (const origin of origins) {
      try {
        const res = await fetch(`${origin}/auth/v1/token?grant_type=refresh_token`, {
          method: "POST",
          headers: {
            apikey: key,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ refresh_token: rt })
        });
        const text = await res.text();
        let json = null;
        try { json = text ? JSON.parse(text) : null; } catch (_e) { json = null; }
        if (!res.ok || !json) {
          const maybeErr = json || { status: res.status, message: res.statusText || "refresh_failed" };
          if (looksLikeUnauthorizedSessionError(maybeErr)) {
            try { window.__DOKE_LAST_REFRESH_AUTH_ERROR__ = maybeErr; } catch (_e) {}
          }
          continue;
        }
        const session = normalizeSessionFromAuthPayload(json, rt);
        if (session?.access_token && session?.refresh_token) return session;
      } catch (_e) {}
    }
    return null;
  }

  function migrateLegacyAuthTokenStorageKey(){
    try {
      if (!DOKE_AUTH_STORAGE_KEY || !EXPECTED_REF) return;
      const alreadyRaw = localStorage.getItem(DOKE_AUTH_STORAGE_KEY);
      if (alreadyRaw) {
        let alreadyParsed = null;
        try { alreadyParsed = JSON.parse(alreadyRaw); } catch (_e) { alreadyParsed = null; }
        const alreadySession = extractSessionCandidate(alreadyParsed || {});
        if (alreadySession?.access_token) return;
      }
      const found = findStoredSessionCandidate(false);
      if (!found?.session?.access_token) return;
      localStorage.setItem(DOKE_AUTH_STORAGE_KEY, JSON.stringify(found.session));
    } catch (_e) {}
  }

  try { migrateLegacyAuthTokenStorageKey(); } catch (_e) {}

  window.dokeGetStoredSupabaseSessionCandidate = function(preferCanonical){
    try {
      const found = findStoredSessionCandidate(preferCanonical !== false);
      return found?.session ? { ...found.session } : null;
    } catch (_e) {
      return null;
    }
  };

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
  const proxyOriginAcrossLocal = (
    isLocalDev &&
    typeof location !== "undefined" &&
    window.DOKE_ALLOW_CROSS_PORT_PROXY === true &&
    !proxyOriginOnThisOrigin
  ) ? resolveReachableProxyOriginSyncAcrossLocal(location.origin) : "";
  const proxyOriginResolved = proxyOriginOnThisOrigin || proxyOriginAcrossLocal;
  const proxyActive = !!proxyOriginResolved;
  let usingLocalProxy = proxyActive;

  // Se o devserver local estiver ativo (na origem atual ou em outra porta local),
  // usa o proxy para eliminar CORS de forma determinÃ­stica em ambiente local.
  if (proxyActive) {
    try {
      window.DOKE_SUPABASE_PROXY_ENABLED = true;
      window.DOKE_SUPABASE_PROXY_UPSTREAM = url;
      window.DOKE_SUPABASE_PROXY_ORIGIN = proxyOriginResolved;
      url = window.DOKE_SUPABASE_PROXY_ORIGIN;
      saveProxyOrigin(proxyOriginResolved);
    } catch (_e) {}
  } else if (isLocalDev) {
    try {
      console.warn("[DOKE] Proxy local não detectado. Para evitar CORS no dev, rode: node doke-devserver.js");
    } catch(_e){}
  }

  // Em dev local, aplica proteção de rede para chamadas Supabase:
  // - com proxy: reescreve URLs absolutas para o proxy local (mesma/otra origem local)
  // - sem proxy: aplica backoff/retry em 520/erros transitórios no host Supabase
  try {
    if (
      isLocalDev &&
      typeof window !== "undefined" &&
      typeof window.fetch === "function" &&
      !window.fetch.__DOKE_PROXY_REWRITE__
    ) {
      const upstreamHost = (new URL(window.DOKE_SUPABASE_PROXY_UPSTREAM || DEFAULT_URL)).host;
      const upstreamOrigin = (new URL(window.DOKE_SUPABASE_PROXY_UPSTREAM || DEFAULT_URL)).origin;
      const locationOrigin = (typeof location !== "undefined" && location.origin) ? String(location.origin) : "";
      const proxyOrigin = String(window.DOKE_SUPABASE_PROXY_ORIGIN || "").replace(/\/+$/g, "");
      const originalFetch = window.fetch.bind(window);
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
        const parseUrl = (target) => {
          try{
            return new URL(getUrlString(target), locationOrigin || upstreamOrigin || "http://localhost");
          }catch(_){
            return null;
          }
        };
        const isApiPath = (pathname) => /^\/(rest|auth|storage|functions)\/v1\//i.test(String(pathname || ""));
        const isRestPath = (pathname) => /^\/rest\/v1\//i.test(String(pathname || ""));
        const toProxyAbsolute = (parsed) => {
          if (!parsed || !proxyOrigin) return null;
          return `${proxyOrigin}${parsed.pathname || ""}${parsed.search || ""}${parsed.hash || ""}`;
        };
        const shouldRewriteToProxy = (parsed) => {
          if (!usingLocalProxy || !proxyOrigin || !parsed) return false;
          if (parsed.host === upstreamHost) return true;
          return !!(locationOrigin && proxyOrigin !== locationOrigin && parsed.origin === locationOrigin && isApiPath(parsed.pathname));
        };
        const getMethod = (target, reqInit) => {
          try {
            const fromInit = String(reqInit?.method || "").trim();
            if (fromInit) return fromInit.toUpperCase();
            if (typeof Request !== "undefined" && target instanceof Request) {
              return String(target.method || "GET").toUpperCase();
            }
          } catch (_e) {}
          return "GET";
        };
        const pickStoredAccessToken = () => {
          try {
            let session = null;
            if (typeof window.dokeGetStoredSupabaseSessionCandidate === "function") {
              session = window.dokeGetStoredSupabaseSessionCandidate(true);
            } else {
              const found = findStoredSessionCandidate(true);
              session = found?.session || null;
            }
            const token = String(session?.access_token || "").trim();
            if (!token) return "";
            const looksJwt = /^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/.test(token);
            if (!looksJwt || token.length > 4096) return "";
            const payload = decodeJwtPayload(token);
            const expMs = Number(payload?.exp || 0) * 1000;
            if (expMs && expMs < (Date.now() + 15000)) return "";
            return token;
          } catch (_e) {
            return "";
          }
        };
        const sanitizeAuthHeader = (target, reqInit) => {
          try {
            let headers = null;
            let fromRequest = false;
            if (reqInit && reqInit.headers) headers = new Headers(reqInit.headers);
            else if (typeof Request !== "undefined" && target instanceof Request) {
              headers = new Headers(target.headers || {});
              fromRequest = true;
            }
            if (!headers) return { input: target, init: reqInit };

            const auth = String(headers.get("authorization") || "").trim();
            if (auth) {
              const token = auth.replace(/^Bearer\s+/i, "").trim();
              const looksJwt = /^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/.test(token);
              if (!looksJwt || token.length > 4096) {
                headers.delete("authorization");
              }
            }

            const parsed = parseUrl((typeof Request !== "undefined" && target instanceof Request) ? target.url : target);
            const isSupabaseApiRequest = !!(parsed && isApiPath(parsed.pathname));
            if (isSupabaseApiRequest) {
              const authNow = String(headers.get("authorization") || "").trim();
              const authToken = authNow.replace(/^Bearer\s+/i, "").trim();
              const authLooksJwt = /^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/.test(authToken);
              const looksAnonBearer = !!authToken && authToken === String(key || "").trim();
              if (!authLooksJwt || looksAnonBearer) {
                const fallbackToken = pickStoredAccessToken();
                if (fallbackToken) headers.set("authorization", `Bearer ${fallbackToken}`);
              }
              if (!headers.get("apikey") && key) headers.set("apikey", key);
            }

            if (fromRequest && !reqInit) {
              const nextInput = new Request(target, { headers });
              return { input: nextInput, init: reqInit };
            }
            const nextInit = { ...(reqInit || {}), headers };
            return { input: target, init: nextInit };
          } catch (_e) {
            return { input: target, init: reqInit };
          }
        };
        const shouldRetry = (target, reqInit) => {
          try{
            const method = getMethod(target, reqInit);
            if(!["GET", "HEAD", "OPTIONS"].includes(method)) return false;
            const parsed = parseUrl(target);
            if (!parsed || !isApiPath(parsed.pathname)) return false;
            if (proxyOrigin && parsed.origin === proxyOrigin) return true;
            if (parsed.origin === upstreamOrigin) return true;
            if (usingLocalProxy && locationOrigin && parsed.origin === locationOrigin) return true;
            return false;
          }catch(_){
            return false;
          }
        };
        const isRestRequest = (target) => {
          try{
            const parsed = parseUrl(target);
            if (!parsed || !isRestPath(parsed.pathname)) return false;
            if (proxyOrigin && parsed.origin === proxyOrigin) return true;
            if (parsed.origin === upstreamOrigin) return true;
            if (usingLocalProxy && locationOrigin && parsed.origin === locationOrigin) return true;
            return false;
          }catch(_){
            return false;
          }
        };
        try {
          if (typeof input === "string") {
            const u = parseUrl(input);
            if (shouldRewriteToProxy(u)) {
              const nextUrl = toProxyAbsolute(u);
              if (nextUrl) input = nextUrl;
            }
          } else if (typeof URL !== "undefined" && input instanceof URL) {
            if (shouldRewriteToProxy(input)) {
              const nextUrl = toProxyAbsolute(input);
              if (nextUrl) input = nextUrl;
            }
          } else if (typeof Request !== "undefined" && input instanceof Request) {
            const u = parseUrl(input.url);
            if (shouldRewriteToProxy(u)) {
              const nextUrl = toProxyAbsolute(u);
              try {
                const cloned = input.clone();
                input = new Request(nextUrl, cloned);
              } catch (_e2) {
                input = new Request(nextUrl, input);
              }
            }
          }
        } catch (_e) {}
        const sanitizedReq = sanitizeAuthHeader(input, init);
        input = sanitizedReq.input;
        init = sanitizedReq.init;
        const retryable = shouldRetry(input, init) && (window.DOKE_ENABLE_FETCH_RETRY !== false);
        return (async () => {
          try{
            const res = await originalFetch(input, init);
            if(retryable && (res.status === 520 || res.status === 502 || res.status === 503 || res.status === 504)){
              await sleep(140);
              return await originalFetch(input, init);
            }
            return res;
          }catch(err){
            const msg = String(err?.message || err || "").toLowerCase();
            const isNet = msg.includes("failed to fetch") || msg.includes("networkerror") || msg.includes("load failed") || msg.includes("connection reset");
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
    let publicClient = null;
    try {
      publicClient = window.supabase.createClient(url, key, {
        db: { schema: "public" },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      });
    } catch (_e) {
      publicClient = null;
    }
    window.supabaseClient = window.sb;
    window.__supabaseClient = window.sb;
    window.client = window.sb;
    window.getSupabaseClient = function(){
      return window.sb || window.supabaseClient || window.__supabaseClient || null;
    };
    window.sbPublic = publicClient && typeof publicClient.from === "function" ? publicClient : null;
    window.supabasePublicClient = window.sbPublic;
    window.getSupabasePublicClient = function(){
      return window.sbPublic || window.supabasePublicClient || null;
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

    (function patchGetSessionWithStoredFallback(){
      try {
        const authApi = window.sb?.auth;
        if (!authApi || authApi.__DOKE_GETSESSION_PATCHED__) return;
        if (typeof authApi.getSession !== "function") return;
        const originalGetSession = authApi.getSession.bind(authApi);

        authApi.getSession = async function(...args){
          let res = null;
          try {
            res = await originalGetSession(...args);
          } catch (err) {
            res = { data: { session: null }, error: err || null };
          }

          if (res?.data?.session?.access_token) {
            const currentSession = res?.data?.session || null;
            const isFresh = isSessionAccessTokenFresh(currentSession, 15000);
            if (!isFresh && typeof window.dokeRestoreSupabaseSessionFromStorage === "function" && !window.__DOKE_RESTORING_SESSION__) {
              try {
                const restored = await window.dokeRestoreSupabaseSessionFromStorage({ force: true });
                if (restored) {
                  const retry = await originalGetSession().catch(() => ({ data: { session: null }, error: null }));
                  if (retry?.data?.session?.access_token) res = retry;
                }
              } catch (_e) {}
            }

            if (!isSessionAccessTokenFresh(res?.data?.session || null, 15000)) {
              try { await clearInvalidSessionArtifacts("getSession_expired_or_invalid"); } catch (_e) {}
              return { data: { session: null }, error: null };
            }

            try {
              if (!res?.data?.session?.user) {
                const localUser = buildAuthUserFromToken(res.data.session.access_token, null);
                if (localUser) {
                  res = {
                    ...res,
                    data: {
                      ...(res.data || {}),
                      session: {
                        ...(res.data.session || {}),
                        user: localUser
                      }
                    }
                  };
                }
              }
            } catch (_e) {}
            return res;
          }

          const found = findStoredSessionCandidate(true, { allowExpiredAccessToken: false });
          const session = found?.session || null;
          if (session?.access_token && typeof window.dokeRestoreSupabaseSessionFromStorage === "function" && !window.__DOKE_RESTORING_SESSION__) {
            try {
              const restored = await window.dokeRestoreSupabaseSessionFromStorage({ force: true });
              if (restored) {
                const retry = await originalGetSession().catch(() => ({ data: { session: null }, error: null }));
                if (retry?.data?.session?.access_token) return retry;
              }
            } catch (_e) {}
          }
          return res;
        };

        authApi.__DOKE_GETSESSION_PATCHED__ = true;
      } catch (_e) {}
    })();

    (function patchGetUserWithLocalSessionFallback(){
      try {
        const authApi = window.sb?.auth;
        if (!authApi || authApi.__DOKE_GETUSER_PATCHED__) return;
        if (typeof authApi.getUser !== "function") return;
        const originalGetUser = authApi.getUser.bind(authApi);

        const resolveLocalUser = async (jwt) => {
          const tokenFromArg = String(jwt || "").trim();
          if (tokenFromArg) {
            const fromArg = buildAuthUserFromToken(tokenFromArg, null);
            if (fromArg?.id) return fromArg;
          }
          try {
            if (typeof authApi.getSession === "function") {
              const res = await authApi.getSession();
              const session = res?.data?.session || null;
              const sessionUser = session?.user || null;
              if (sessionUser?.id) return sessionUser;
              const fromSessionToken = buildAuthUserFromToken(session?.access_token, sessionUser || null);
              if (fromSessionToken?.id) return fromSessionToken;
            }
          } catch (_e) {}
          try {
            const found = findStoredSessionCandidate(true, { allowExpiredAccessToken: false });
            const fromStored = buildAuthUserFromToken(found?.session?.access_token, found?.session?.user || null);
            if (fromStored?.id) return fromStored;
          } catch (_e) {}
          return null;
        };

        authApi.getUser = async function(jwt){
          let res = null;
          try {
            res = await originalGetUser(jwt);
          } catch (err) {
            res = { data: { user: null }, error: err || null };
          }

          if (!res?.error && res?.data?.user) return res;

          const status = Number(res?.error?.status || res?.status || 0);
          const msg = String(res?.error?.message || "").toLowerCase();
          const unauthorized = status === 401 || msg.includes("unauthorized") || msg.includes("jwt");
          const networkLike = status === 0 || msg.includes("failed to fetch") || msg.includes("network") || msg.includes("timeout");
          if (unauthorized && typeof window.dokeRestoreSupabaseSessionFromStorage === "function") {
            try {
              const restored = await window.dokeRestoreSupabaseSessionFromStorage({ force: true });
              if (restored) {
                try {
                  const retry = await originalGetUser(jwt);
                  if (!retry?.error && retry?.data?.user) return retry;
                  res = retry || res;
                } catch (_e) {}
              }
            } catch (_e) {}
          }

          if (unauthorized) {
            const localLast = await resolveLocalUser(jwt);
            if (localLast?.id) {
              try {
                if (typeof window.dokeRestoreSupabaseSessionFromStorage === "function" && !window.__DOKE_RESTORING_SESSION__) {
                  Promise.resolve().then(() => window.dokeRestoreSupabaseSessionFromStorage({ force: true })).catch(() => {});
                }
              } catch (_e) {}
              return { data: { user: localLast }, error: null };
            }
            const shouldClear = (window.DOKE_FORCE_SIGNOUT === true) || !isLocalDev;
            if (shouldClear) {
              try { await clearInvalidSessionArtifacts("getUser_unauthorized"); } catch (_e) {}
            } else {
              try { console.warn("[DOKE] Sessao invalida (getUser_unauthorized), mantendo cache local no dev."); } catch (_e) {}
            }
            return { data: { user: null }, error: res?.error || null };
          }

          if (networkLike) {
            const localLast = await resolveLocalUser(jwt);
            if (localLast?.id) return { data: { user: localLast }, error: null };
          }

          return res || { data: { user: null }, error: null };
        };

        authApi.__DOKE_GETUSER_PATCHED__ = true;
      } catch (_e) {}
    })();

    window.dokeRestoreSupabaseSessionFromStorage = async function(opts){
      if (window.__DOKE_RESTORING_SESSION__) return false;
      window.__DOKE_RESTORING_SESSION__ = true;
      try {
        const force = !!(opts && opts.force === true);
        if (!window.sb?.auth?.getSession || typeof window.sb.auth.setSession !== "function") return false;

        const currentRes = await window.sb.auth.getSession().catch(() => ({ data: { session: null }, error: null }));
        const currentSession = currentRes?.data?.session || null;
        if (!force && currentSession?.access_token) return true;

        const found = findStoredSessionCandidate(true, { requireRefreshToken: true, allowExpiredAccessToken: true });
        const session = found?.session || null;
        if (!session?.access_token || !session?.refresh_token) return false;

        let restoredSession = null;
        let setError = null;
        try {
          const { data, error } = await window.sb.auth.setSession({
            access_token: session.access_token,
            refresh_token: session.refresh_token
          });
          if (!error && data?.session?.access_token) restoredSession = data.session;
          if (error) setError = error;
        } catch (err) {
          setError = err || null;
        }

        if (!restoredSession) {
          const refreshed = await refreshSessionViaAuthRest(session.refresh_token);
          if (refreshed?.access_token && refreshed?.refresh_token) {
            try {
              const retrySet = await window.sb.auth.setSession({
                access_token: refreshed.access_token,
                refresh_token: refreshed.refresh_token
              });
              if (!retrySet?.error && retrySet?.data?.session?.access_token) {
                restoredSession = retrySet.data.session;
              }
            } catch (_e) {}
            if (!restoredSession) restoredSession = refreshed;
          }
        }

        if (restoredSession?.access_token) {
          // IMPORTANTE: removido o probe em /auth/v1/user.
          // Ele gerava ruído no console (401) mesmo quando a sessão estava ok/recuperável.
          // A validação de exp do JWT + o próprio SDK já cobrem o necessário.
          const tokenIsValid = true;
          if (!tokenIsValid) {
            await clearInvalidSessionArtifacts("restore_token_invalid");
            return false;
          }
        }

        if (!restoredSession?.access_token) {
          try { console.warn("[DOKE] Falha ao restaurar sessao do storage.", setError || null); } catch (_e) {}
          const refreshErr = window.__DOKE_LAST_REFRESH_AUTH_ERROR__ || null;
          if (looksLikeUnauthorizedSessionError(setError) || looksLikeUnauthorizedSessionError(refreshErr)) {
            try { await clearInvalidSessionArtifacts("restore_failed_unauthorized"); } catch (_e2) {}
          }
          return false;
        }

        persistSessionArtifacts(restoredSession);
        return true;
      } catch (_e) {
        return false;
      } finally {
        window.__DOKE_RESTORING_SESSION__ = false;
      }
    };

    try { window.dokeRestoreSupabaseSessionFromStorage({ force: false }); } catch (_e) {}

    (async function normalizeLocalLoginCacheIfSessionMissing(){
      try {
        if (!window.sb?.auth?.getSession) return;
        const { data, error } = await window.sb.auth.getSession();
        const hasSession = !error && !!(data?.session?.access_token);
        if (hasSession) return;
        const found = findStoredSessionCandidate(true);
        if (found?.session?.access_token) return;
        localStorage.removeItem("usuarioLogado");
        localStorage.removeItem("doke_uid");
      } catch (_e) {}
    })();

    // Em dev local, bloqueia logout involuntario no boot (sem gesto do usuario).
    // Isso evita loop "deslogado fantasma" quando algum script legado chama signOut.
    (function installLocalSignOutGuard(){
      try{
        if (!isLocalDev || !window.sb?.auth) return;
        if (window.sb.auth.__DOKE_SIGNOUT_GUARD__) return;

        const authApi = window.sb.auth;
        const originalSignOut = (typeof authApi.signOut === "function")
          ? authApi.signOut.bind(authApi)
          : null;
        if (!originalSignOut) return;

        const markGesture = () => { window.__DOKE_LAST_USER_GESTURE_AT = Date.now(); };
        if (!window.__DOKE_SIGNOUT_GESTURE_BOUND__) {
          window.__DOKE_SIGNOUT_GESTURE_BOUND__ = true;
          try { window.addEventListener("pointerdown", markGesture, { capture: true }); } catch(_e) {}
          try { window.addEventListener("mousedown", markGesture, { capture: true }); } catch(_e) {}
          try { window.addEventListener("touchstart", markGesture, { capture: true }); } catch(_e) {}
          try { window.addEventListener("keydown", markGesture, { capture: true }); } catch(_e) {}
        }

        window.dokeAllowSignOut = function(ms){
          const ttl = Math.max(1000, Number(ms) || 7000);
          window.__DOKE_ALLOW_SIGNOUT_UNTIL = Date.now() + ttl;
        };

        authApi.signOut = async function(...args){
          const now = Date.now();
          const allowUntil = Number(window.__DOKE_ALLOW_SIGNOUT_UNTIL || 0);
          const lastGestureAt = Number(window.__DOKE_LAST_USER_GESTURE_AT || 0);
          const hasRecentGesture = (now - lastGestureAt) >= 0 && (now - lastGestureAt) < 7000;
          const forced = window.DOKE_FORCE_SIGNOUT === true;

          if (!forced && allowUntil < now && !hasRecentGesture) {
            try { console.warn("[DOKE] signOut automatico bloqueado em localhost."); } catch(_e) {}
            return { error: null };
          }
          const out = await originalSignOut(...args);
          try { localStorage.removeItem(DOKE_SESSION_BACKUP_KEY); } catch(_e) {}
          try { clearDevSessionCookie(); } catch(_e) {}
          return out;
        };

        authApi.__DOKE_SIGNOUT_GUARD__ = true;
      } catch(_e) {}
    })();

    // Reidrata cache local de login a partir da sessão real (evita "deslogado fantasma")
    // quando usuarioLogado/doke_usuario_perfil foram limpos por scripts legados.
    (async function hydrateLocalLoginCacheFromSession(){
      try{
        const pickCachedUserFromStorage = () => {
          try {
            const keys = Object.keys(localStorage).filter((k) => /^sb-[a-z0-9-]+-auth-token$/i.test(k));
            if (!keys.length) return null;
            const preferred = DOKE_AUTH_STORAGE_KEY;
            if (preferred && keys.includes(preferred)) {
              keys.splice(keys.indexOf(preferred), 1);
              keys.unshift(preferred);
            }
            for (const k of keys) {
              const raw = localStorage.getItem(k);
              if (!raw) continue;
              let parsed = null;
              try { parsed = JSON.parse(raw); } catch(_e) { parsed = null; }
              if (!parsed || typeof parsed !== "object") continue;
              const sessions = [parsed, parsed.currentSession, parsed.session, parsed.data?.session].filter(Boolean);
              for (const sess of sessions) {
                if (sess?.user?.id) return sess.user;
                const token = String(sess?.access_token || "").trim();
                if (!token) continue;
                const payload = decodeJwtPayload(token);
                const uid = String(payload?.sub || "").trim();
                if (!uid) continue;
                return { id: uid, email: payload?.email || "" };
              }
            }
          } catch(_e) {}
          return null;
        };

        if(!window.sb?.auth?.getSession) return;
        const { data, error } = await window.sb.auth.getSession();
        let user = (!error ? (data?.session?.user || null) : null);
        if(!user) user = pickCachedUserFromStorage();
        if(!user) return;
        const uid = String(user.id || "").trim();
        if(!uid) return;
        localStorage.setItem("usuarioLogado", "true");
        localStorage.setItem("doke_uid", uid);
        try {
          if (window.auth && typeof window.auth === "object") {
            window.auth.currentUser = { uid, id: uid, email: user.email || null, user_metadata: user.user_metadata || {} };
          }
        } catch(_e) {}
        if(!localStorage.getItem("doke_usuario_perfil")){
          const meta = user.user_metadata || {};
          const nome = meta.nome || meta.full_name || (user.email ? String(user.email).split("@")[0] : "Usuario");
          const perfil = {
            uid,
            id: uid,
            email: user.email || "",
            nome,
            user: meta.user || meta.username || nome,
            foto: meta.foto || meta.avatar_url || ""
          };
          localStorage.setItem("doke_usuario_perfil", JSON.stringify(perfil));
        }
      }catch(_e){}
    })();

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
            try {
              if (!res?.error && res?.data?.session) persistSessionArtifacts(res.data.session);
            } catch (_e) {}
            return res;
          }catch(e){
            const msg = String(e?.message || e);
            if(/failed to fetch/i.test(msg)) {
              const viaFetch = await signInViaFetch(args?.email, args?.password);
              try {
                if (!viaFetch?.error && viaFetch?.data?.session) persistSessionArtifacts(viaFetch.data.session);
              } catch (_e) {}
              return viaFetch;
            }
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
    const accessToken = String(session.access_token || "").trim();
    const tokenLooksJwt = /^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/.test(accessToken);
    if (!tokenLooksJwt || accessToken.length > 4096) {
      try {
        const upstream = window.DOKE_SUPABASE_PROXY_UPSTREAM || DEFAULT_URL || url;
        const ref = (new URL(upstream)).hostname.split(".")[0];
        localStorage.removeItem(`sb-${ref}-auth-token`);
      } catch(_e) {}
      return;
    }
    const expiresAtMs = session.expires_at ? session.expires_at * 1000 : 0;
    const needsRefresh = expiresAtMs && (expiresAtMs - Date.now() < 10 * 60 * 1000);
    if (needsRefresh && typeof window.sb.auth.refreshSession === "function") {
      const { error } = await window.sb.auth.refreshSession();
      if (error) {
        if (looksLikeUnauthorizedSessionError(error)) {
          await clearInvalidSessionArtifacts("refresh_session_unauthorized");
        } else {
          // Nao derrubar sessao automaticamente em falha transitoria de refresh.
          try { console.warn("[DOKE] refreshSession falhou; mantendo sessao local.", error); } catch(_e) {}
        }
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

  function decodeJwtPayloadLocal(token){
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

  function isJwtTokenUsable(token, skewMs){
    const raw = String(token || "").trim();
    if (!raw) return false;
    const looksJwt = /^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/.test(raw);
    if (!looksJwt || raw.length > 4096) return false;
    const payload = decodeJwtPayloadLocal(raw);
    const expMs = Number(payload?.exp || 0) * 1000;
    if (expMs) {
      const skew = Math.max(5000, Number(skewMs) || 15000);
      if (expMs < (Date.now() + skew)) return false;
    }
    return true;
  }

  let __dokeLastForcedRestoreAt = 0;
  async function tryForceRestoreSessionOnce(){
    if (typeof w.dokeRestoreSupabaseSessionFromStorage !== "function") return false;
    const now = Date.now();
    if ((now - __dokeLastForcedRestoreAt) < 5000) return false;
    __dokeLastForcedRestoreAt = now;
    try {
      return !!(await w.dokeRestoreSupabaseSessionFromStorage({ force: true }));
    } catch (_e) {
      return false;
    }
  }

  async function getAuthToken(){
    try{
      const sb = w.sb;
      if(sb?.auth?.getSession){
        const { data } = await sb.auth.getSession();
        let token = String(data?.session?.access_token || "").trim();
        if (isJwtTokenUsable(token, 15000)) return token;

        const restored = await tryForceRestoreSessionOnce();
        if (restored) {
          const retry = await sb.auth.getSession().catch(() => ({ data: { session: null } }));
          token = String(retry?.data?.session?.access_token || "").trim();
          if (isJwtTokenUsable(token, 15000)) return token;
        }
      }
    }catch(_e){}
    try{
      const found = (typeof w.dokeGetStoredSupabaseSessionCandidate === "function")
        ? { session: w.dokeGetStoredSupabaseSessionCandidate(true) }
        : null;
      const token = String(found?.session?.access_token || "").trim();
      if (isJwtTokenUsable(token, 15000)) return token;
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

