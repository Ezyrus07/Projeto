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

const url =
  window.DOKE_SUPABASE_URL ||
  window.SUPABASE_URL ||
  localStorage.getItem("DOKE_SUPABASE_URL") ||
  DEFAULT_URL;

  
const key =
  window.DOKE_SUPABASE_ANON_KEY ||
  window.SUPABASE_ANON_KEY ||
  localStorage.getItem("DOKE_SUPABASE_ANON_KEY") ||
  DEFAULT_KEY;
  
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


  try{
    window.sb = window.supabase.createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      }
    });
    console.log("[DOKE] Supabase conectado (global).");
  }catch(e){
    warn("Falha ao criar cliente Supabase: " + (e && e.message ? e.message : e));
  }
})();
