// STEP A (Reliability) - AuthGuard + 401 handling + safe redirects
// Goals:
// 1) Make login state consistent across header/pages (no "looks logged" when session expired).
// 2) Prevent endless spinners by redirecting to login on real auth expiry.
// 3) Keep changes non-breaking: only acts on protected pages.

(function(){
  'use strict';

  const LOGIN_PAGE = 'login.html';

  // Pages that require a valid session
  const PROTECTED = new Set([
    'mensagens.html',
    'pedido.html',
    'pedidos.html',
    'chat.html',
    'meuperfil.html',
    'perfil.html',
    'perfil-profissional.html',
    'pagar.html',
    'pagamentos.html',
    'carteira.html',
    'orcamento.html',
    'orcamentos.html',
    'notificacoes.html',
    'mais.html',
    'endereco.html',
    'enderecos.html',
    'seguranca.html',
    'configuracoes.html',
  ]);

  function getFileName(){
    try{
      const p = (location.pathname || '').split('?')[0];
      const last = p.split('/').pop() || '';
      return last || 'index.html';
    }catch(_){ return 'index.html'; }
  }

  function isProtected(){
    const f = getFileName();
    return PROTECTED.has(f);
  }

  function clearAuthCaches(){
    // Keep conservative: remove only known keys used by the project to fake login.
    const keys = [
      'usuarioLogado',
      'doke_usuario_perfil',
      'doke_user',
      'dokeUser',
      'DOKE_USER',
      'perfilUsuario',
      'perfil_usuario',
      'DOKE_AUTH_USER',
      'DOKE_AUTH_SESSION',
    ];
    try{
      keys.forEach(k=>{ try{ localStorage.removeItem(k); }catch(_){ } });
      // Also clear any cached "next" in case of loops
      try{ sessionStorage.removeItem('DOKE_LAST_NEXT'); }catch(_){ }
    }catch(_){ }
  }

  function redirectToLogin(reason){
    try{
      const next = location.href;
      // avoid redirect loops
      const last = sessionStorage.getItem('DOKE_LAST_NEXT');
      if(last && last === next) return;
      sessionStorage.setItem('DOKE_LAST_NEXT', next);
      clearAuthCaches();
      const url = `${LOGIN_PAGE}?next=${encodeURIComponent(next)}${reason ? `&reason=${encodeURIComponent(reason)}` : ''}`;
      location.href = url;
    } catch(_){ }
  }

  async function getSession(){
    // Prefer the de-duped getter from Step4
    try{
      if(typeof window.dokeGetSupabaseSessionSafe === 'function'){
        return await window.dokeGetSupabaseSessionSafe();
      }
    } catch(_){ }

    // Fallback: poll for client then call getSession
    const deadline = Date.now() + 3500;
    while(Date.now() < deadline){
      const sb = window.getSupabaseClient ? window.getSupabaseClient() : (window.sb || window.supabaseClient);
      if(sb && sb.auth && typeof sb.auth.getSession === 'function'){
        try{
          return await sb.auth.getSession();
        }catch(_){ return null; }
      }
      await new Promise(r=>setTimeout(r, 120));
    }
    return null;
  }

  function hasValidSession(sessRes){
    try{
      const s = sessRes && sessRes.data ? sessRes.data.session : null;
      return !!(s && s.access_token);
    }catch(_){ return false; }
  }

  async function runGuard(){
    if(!isProtected()) return;

    const sessRes = await getSession();
    if(!hasValidSession(sessRes)){
      redirectToLogin('auth_required');
    }
  }

  // If Supabase tells us auth is expired (401 from /auth/v1), react:
  window.addEventListener('doke:auth-expired', function(){
    try{
      clearAuthCaches();
      if(isProtected()) redirectToLogin('auth_expired');
    }catch(_){ }
  });

  // Run once per page load
  try{
    if(document.readyState === 'loading'){
      document.addEventListener('DOMContentLoaded', runGuard, { once: true });
    } else {
      runGuard();
    }
  }catch(_){ }

})();
