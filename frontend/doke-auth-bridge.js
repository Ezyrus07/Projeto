(function(){
  async function resolveSession(){
    const sb = window.sb || window.supabaseClient || window.sbClient || window.supabase;
    if(!sb || !sb.auth || typeof sb.auth.getSession !== 'function') return null;
    try{
      const { data } = await sb.auth.getSession();
      return data && data.session ? data.session : null;
    }catch(_){ return null; }
  }

  async function sync(){
    const session = await resolveSession();
    const user = session && session.user ? session.user : null;
    const uid = String(user && (user.id || user.uid) || '').trim();
    const email = String(user && user.email || '').trim();
    const forced = Number(localStorage.getItem('doke_force_logged_out_at') || sessionStorage.getItem('doke_force_logged_out_at') || 0);
    const forceActive = Number.isFinite(forced) && forced > 0 && (Date.now() - forced) < 7*24*60*60*1000;
    if(forceActive && !uid){
      try{ localStorage.removeItem('usuarioLogado'); }catch(_){ }
      try{ localStorage.removeItem('doke_uid'); }catch(_){ }
      try{ localStorage.removeItem('doke_auth_verified_at'); }catch(_){ }
      return null;
    }
    if(!uid) return null;
    try{ localStorage.setItem('usuarioLogado','true'); }catch(_){ }
    try{ localStorage.setItem('doke_uid',uid); }catch(_){ }
    try{ localStorage.setItem('doke_auth_verified_at', String(Date.now())); }catch(_){ }
    try{ sessionStorage.setItem('doke_auth_verified_at', String(Date.now())); }catch(_){ }
    try{ localStorage.setItem('doke_auth_session_backup', JSON.stringify(session)); }catch(_){ }
    try{
      const raw = localStorage.getItem('doke_usuario_perfil') || '{}';
      const perfil = JSON.parse(raw);
      const merged = Object.assign({}, perfil || {}, { uid: uid, id: uid, email: email || (perfil && perfil.email) || null });
      localStorage.setItem('doke_usuario_perfil', JSON.stringify(merged));
    }catch(_){ }
    return { uid, email };
  }

  window.dokeAuthBridge = { sync };
  window.dokeResolvedUidPromise = sync().then(function(res){ return res && res.uid ? res.uid : ''; }).catch(function(){ return ''; });
})();
