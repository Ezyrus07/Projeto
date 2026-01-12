// [PATCH] removido const supabase global (usa window.supabaseClient / window.supabase)
// DOKE - Supabase init (global, robust)
// Config priority (first match wins):
// 1) window.__DOKE_SUPABASE__ = { url, anonKey }
// 2) localStorage: DOKE_SUPABASE_URL, DOKE_SUPABASE_ANON_KEY
// 3) Edit constants below (SUPABASE_URL / SUPABASE_ANON_KEY)
//
// IMPORTANT: Use "anon public" key from Supabase Settings -> API. Do NOT use service_role in frontend.

(function () {
  // Firebase placeholders (para não quebrar código legado)
  window.initializeApp = window.initializeApp || function(){ return {}; };
  window.getFirestore = window.getFirestore || function(){ return {}; };
  window.getAuth = window.getAuth || function(){ return {}; };

  const fromWindow = (window.__DOKE_SUPABASE__ && typeof window.__DOKE_SUPABASE__ === "object")
    ? window.__DOKE_SUPABASE__ : null;

  const SUPABASE_URL =
    (fromWindow && fromWindow.url) ||
    localStorage.getItem("DOKE_SUPABASE_URL") ||
    "https://wgbnoqjnvhasapqarltu.supabase.co";

  const SUPABASE_ANON_KEY =
    (fromWindow && fromWindow.anonKey) ||
    localStorage.getItem("DOKE_SUPABASE_ANON_KEY") ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndnYm5vcWpudmhhc2FwcWFybHR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwODEwMzgsImV4cCI6MjA4MzY1NzAzOH0.qZZQJ7To8EYe5eELG2DzwU9Vh0gn6tAkAbCLmns8ScQ";

  function banner(msg) {
    console.warn("[DOKE] " + msg);
    try {
      // Non-blocking UI hint
      const el = document.createElement("div");
      el.style.cssText = "position:fixed;left:12px;right:12px;bottom:12px;z-index:999999;background:#0b1220;color:#fff;border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:12px 14px;font:14px system-ui;box-shadow:0 10px 30px rgba(0,0,0,.35)";
      el.innerHTML = "<b>DOKE</b> - " + msg;
      document.body.appendChild(el);
      setTimeout(()=>el.remove(), 12000);
    } catch(e) {}
  }

  // supabase-js UMD must be loaded first: window.supabase (library)
  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    console.error("[DOKE] Biblioteca supabase-js não carregou.");
    return;
  }
  window.supabaseJsLib = window.supabase;

  // Validate config (do NOT throw; avoid breaking the site)
  if (!SUPABASE_URL || !String(SUPABASE_URL).startsWith("http")) {
    banner("Supabase URL ausente. Abra supabase-init.js e substitua pela Project URL.");
    return;
  }
  if (!SUPABASE_ANON_KEY || String(SUPABASE_ANON_KEY).includes("COLE_AQUI")) {
    banner("Supabase ANON KEY ausente. Cole a anon public key do Supabase (Settings -> API).");
    return;
  }
  // Common mistake: sb_publishable_*
  if (String(SUPABASE_ANON_KEY).startsWith("sb_publishable_")) {
    banner("Key incorreta: voce colou sb_publishable_. Use a ANON PUBLIC KEY (JWT grande) do Supabase.");
    return;
  }

  try {
    const client = window.supabaseJsLib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    window.sbClient = client;
    window.supabaseClient = client;

    // Back-compat for legacy code that expects global `supabase`
    window.supabase = client;

    console.log("[DOKE] Supabase conectado (global).");
  } catch (e) {
    console.error("[DOKE] Falha ao inicializar Supabase:", e);
  }
})();
