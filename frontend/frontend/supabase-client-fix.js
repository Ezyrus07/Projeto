/* DOKE - Supabase client shim
   Fix para: TypeError: window.supabase.from is not a function
   (quando window.supabase é o *namespace* do SDK e não o client).
*/
(function(){
  const w = window;
  const isClient = (o) => !!(o && typeof o.from === 'function');
  const normalizeUrl = (raw) => String(raw || "")
    .trim()
    .replace(/\/(auth|rest)\/v1.*$/i, "")
    .replace(/\/+$/g, "");

  if (isClient(w.supabase)) return;

  // tenta reapontar para um client já criado
  const aliases = [w.sb, w.supabaseClient, w.__supabaseClient, w.client];
  for (const a of aliases){
    if (isClient(a)){
      w.supabase = a;
      w.supabaseClient = a;
      w.sb = a;
      w.__supabaseClient = a;
      try{ console.info('[DOKE] Supabase shim: usando client global existente.'); }catch(_){ }
      return;
    }
  }

  // se window.supabase for o namespace do SDK, tenta criar um client com config já exposta
  const ns = w.supabase;
  if (ns && typeof ns.createClient === 'function'){
    const url = normalizeUrl(
      w.DOKE_SUPABASE_URL ||
      w.SUPABASE_URL ||
      w.supabaseUrl ||
      w.supabase_url ||
      localStorage.getItem('DOKE_SUPABASE_URL') ||
      localStorage.getItem('SUPABASE_URL') ||
      localStorage.getItem('supabase_url')
    );
    const key = w.DOKE_SUPABASE_ANON_KEY || w.SUPABASE_ANON_KEY || w.supabaseAnonKey || w.supabase_anon_key || localStorage.getItem('DOKE_SUPABASE_ANON_KEY') || localStorage.getItem('SUPABASE_ANON_KEY') || localStorage.getItem('supabase_anon_key');
    if (url && key){
      try{
        const created = ns.createClient(url, key, {
          db: { schema: 'public' },
          // IMPORTANT: não force Content-Profile globalmente.
          // Deixe o supabase-js enviar os headers de schema quando necessário.
          auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
        });
        w.supabase = created;
        w.supabaseClient = created;
        w.sb = created;
        w.__supabaseClient = created;
        try{ console.info('[DOKE] Supabase shim: client criado via createClient().'); }catch(_){ }
        return;
      }catch(e){
        try{ console.warn('[DOKE] Supabase shim: falha ao criar client.', e); }catch(_){ }
      }
    }
  }

  // helper opcional
  w.getSupabaseClient = function(){
    if (isClient(w.supabase)) return w.supabase;
    for (const a of aliases) if (isClient(a)) return a;
    return null;
  };

  try{ console.warn('[DOKE] Supabase shim: nenhum client encontrado. Confira o supabase-init.js.'); }catch(_){ }
})();

