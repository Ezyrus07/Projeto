/* Doke - Comunidades Supabase Patch
   Reforça o fix do client antes das funções de listagem.
   Mantém compat com script.js antigo que usa window.supabase.from(...)
*/
(function(){
  const w = window;
  const isClient = (o) => !!(o && typeof o.from === 'function');

  // reaproveita o shim (se já estiver carregado)
  if (typeof w.getSupabaseClient === 'function'){
    const c = w.getSupabaseClient();
    if (isClient(c)){
      w.supabase = c;
      return;
    }
  }

  // tentativa rápida com aliases
  const aliases = [w.sb, w.supabaseClient, w.__supabaseClient, w.client];
  for (const a of aliases){
    if (isClient(a)){
      w.supabase = a;
      w.supabaseClient = a;
      w.sb = a;
      w.__supabaseClient = a;
      return;
    }
  }
})();

// UX: evita quebra total se alguma função do script.js lançar erro
window.addEventListener('error', (ev) => {
  try{
    const msg = String(ev?.message || '');
    if (msg.includes('window.supabase.from') || msg.includes('Supabase')){
      console.warn('[DOKE] Comunidades patch: erro capturado', ev);
      if (window.showToast) window.showToast('Erro ao carregar comunidades. Verifique o Supabase e recarregue.');
    }
  }catch(_){ }
});


