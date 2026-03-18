(function(){
  function readJson(raw){
    try{ if(!raw) return null; let v=raw; for(let i=0;i<2;i+=1){ if(typeof v!=="string") break; v = v ? JSON.parse(v) : null; } return v && typeof v === "object" ? v : null; }catch(_){ return null; }
  }
  function decodeJwtPayload(token){
    try{ const parts = String(token||'').split('.'); if(parts.length < 2) return null; const b64 = parts[1].replace(/-/g,'+').replace(/_/g,'/'); const pad = '='.repeat((4 - (b64.length % 4)) % 4); return JSON.parse(atob(b64 + pad)); }catch(_){ return null; }
  }
  function normalizeExpMs(raw){ const n = Number(raw||0); if(!Number.isFinite(n) || n <= 0) return 0; return n > 1e12 ? n : n*1000; }
  function buildSessionCandidate(source){
    if(!source || typeof source !== 'object') return null;
    const sessions = [source, source.currentSession, source.session, source.data && source.data.session];
    for(const session of sessions){
      if(!session || typeof session !== 'object') continue;
      const access = String(session.access_token || '').trim();
      if(!access) continue;
      const payload = decodeJwtPayload(access);
      const expiresAtMs = normalizeExpMs(session.expires_at || session.expiresAt || (payload && payload.exp));
      if(expiresAtMs && expiresAtMs <= Date.now() + 10000) continue;
      const user = session.user && typeof session.user === 'object' ? session.user : null;
      const uid = String((user && (user.id || user.uid)) || (payload && payload.sub) || '').trim();
      return { access_token: access, expires_at_ms: expiresAtMs, uid, user: user || (uid ? { id: uid, uid, email: payload && payload.email ? payload.email : '' } : null) };
    }
    return null;
  }
  function getStoredSession(){
    try{
      for(const key of Object.keys(localStorage||{})){
        if(!/^sb-[a-z0-9-]+-auth-token$/i.test(String(key||''))) continue;
        const parsed = buildSessionCandidate(readJson(localStorage.getItem(key)||''));
        if(parsed) return parsed;
      }
    }catch(_){}
    const backup = buildSessionCandidate(readJson(localStorage.getItem('doke_auth_session_backup')||''));
    if(backup) return backup;
    return null;
  }
  function persistMarkers(uid, email){
    try{
      const safeUid = String(uid||'').trim();
      if(!safeUid) return false;
      localStorage.setItem('usuarioLogado','true');
      localStorage.setItem('doke_uid', safeUid);
      localStorage.setItem('doke_auth_verified_at', String(Date.now()));
      try{ sessionStorage.setItem('doke_auth_verified_at', String(Date.now())); }catch(_e){}
      try{
        const perfil = readJson(localStorage.getItem('doke_usuario_perfil')||'') || {};
        localStorage.setItem('doke_usuario_perfil', JSON.stringify(Object.assign({}, perfil, { uid: safeUid, id: safeUid, email: email || perfil.email || '' })));
      }catch(_e){}
      return true;
    }catch(_){ return false; }
  }
  async function resolveSession(){
    try{
      const sb = window.sb || window.supabaseClient || window.sbClient || window.supabase || null;
      if(sb && sb.auth && typeof sb.auth.getSession === 'function'){
        const { data, error } = await sb.auth.getSession();
        const session = !error && data && data.session ? data.session : null;
        if(session && session.user && session.access_token){
          const uid = String(session.user.id || session.user.uid || '').trim();
          if(uid){ try{ localStorage.setItem('doke_auth_session_backup', JSON.stringify(session)); }catch(_e){} persistMarkers(uid, session.user.email || ''); return { uid, user: session.user, session }; }
        }
      }
    }catch(_e){}
    const stored = getStoredSession();
    if(stored && stored.uid){ persistMarkers(stored.uid, stored.user && stored.user.email || ''); return { uid: stored.uid, user: stored.user || null, session: stored }; }
    return { uid: '', user: null, session: null };
  }
  window.dokeAuthBridge = { readJson, buildSessionCandidate, getStoredSession, resolveSession, persistMarkers, async getUid(){ const out = await resolveSession(); return String(out.uid || '').trim(); }, async isAuthenticated(){ const out = await resolveSession(); return !!String(out.uid || '').trim(); } };
})();
