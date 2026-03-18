(function(){
  function readJson(raw){ try{return raw?JSON.parse(raw):null;}catch(_){return null;} }
  function normalizeSession(data){
    var session = data && (data.session || data.currentSession || (data.data && data.data.session)) || null;
    if (!session || !session.user) return null;
    var uid = String(session.user.id || session.user.uid || '').trim();
    if (!uid) return null;
    return { uid: uid, user: session.user, session: session };
  }
  async function resolve(){
    try{
      if (window.sb && window.sb.auth && typeof window.sb.auth.getSession === 'function') {
        var got = await window.sb.auth.getSession();
        var normalized = normalizeSession(got && got.data ? got.data : got);
        if (normalized) return normalized;
      }
    }catch(_e){}
    try{
      if (window.supabaseClient && window.supabaseClient.auth && typeof window.supabaseClient.auth.getSession === 'function') {
        var got2 = await window.supabaseClient.auth.getSession();
        var normalized2 = normalizeSession(got2 && got2.data ? got2.data : got2);
        if (normalized2) return normalized2;
      }
    }catch(_e2){}
    try{
      var uid = String(localStorage.getItem('doke_uid') || '').trim();
      var flag = String(localStorage.getItem('usuarioLogado') || '').toLowerCase();
      if (uid && (flag === 'true' || flag === '1')) return { uid: uid, user: { id: uid } };
    }catch(_e3){}
    return null;
  }
  window.dokeResolvedUidPromise = (async function(){
    var result = await resolve();
    if (result && result.uid) {
      try {
        localStorage.setItem('doke_uid', result.uid);
        localStorage.setItem('usuarioLogado', 'true');
        localStorage.setItem('doke_auth_verified_at', String(Date.now()));
      } catch(_e){}
      return result.uid;
    }
    return '';
  })();
})();
