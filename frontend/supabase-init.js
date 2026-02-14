/* DOKE — Supabase init (global)
   ------------------------------------------------------------
   1) Cole aqui o Project URL e a ANON PUBLIC KEY (JWT grande)
      Settings > API > Project URL
      Settings > API > Project API keys > anon public
   2) Este arquivo cria: window.sb (cliente Supabase)
*/
(function(){
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
    localStorage.setItem("DOKE_SUPABASE_URL", url);
    localStorage.setItem("SUPABASE_URL", url);
    localStorage.setItem("supabase_url", url);
    localStorage.setItem("DOKE_SUPABASE_ANON_KEY", key);
    localStorage.setItem("SUPABASE_ANON_KEY", key);
    localStorage.setItem("supabase_anon_key", key);
    const ref = (new URL(url)).hostname.split(".")[0];
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
      auth: {
        persistSession: true,
        // Evita enxurrada de refresh_token em ambientes com CORS/rede instável.
        autoRefreshToken: true,
        detectSessionInUrl: true,
      }
    });
    window.__DOKE_SUPABASE_INFO__ = { url, isLocalDev };
    console.log("[DOKE] Supabase conectado (global).");
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
          const ref = (new URL(url)).hostname.split(".")[0];
          localStorage.removeItem(`sb-${ref}-auth-token`);
        } catch(_e) {}
      }
    }
  } catch(_e) {}
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



