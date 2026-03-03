// STEP 4 - Performance & stability patch (safe, global)
// Goals:
// 1) De-dupe/cached Supabase auth session reads to avoid lock contention (mobile Safari).
// 2) Add conservative timeout + single retry for GET requests to Supabase REST endpoints.
// NOTE: Does NOT modify writes (POST/PATCH/DELETE).

(function(){
  'use strict';

  const SB_URL_HINTS = ['supabase.co', '/rest/v1/', '/auth/v1/', '/storage/v1/'];

  function isSupabaseUrl(url){
    try{
      if(!url) return false;
      const s = String(url);
      return SB_URL_HINTS.some(h => s.includes(h));
    }catch(_){ return false; }
  }

  // ---- Auth session de-dupe ----
  let _sessInflight = null;
  let _sessCache = null;
  let _sessCacheAt = 0;
  const SESS_TTL_MS = 2500;

  async function getSessionSafe(){
    const sb = window.sb || window.supabaseClient;
    if(!sb || !sb.auth || typeof sb.auth.getSession !== 'function') return null;

    const now = Date.now();
    if(_sessCache && (now - _sessCacheAt) < SESS_TTL_MS) return _sessCache;
    if(_sessInflight) return _sessInflight;

    _sessInflight = (async ()=>{
      try{
        const res = await sb.auth.getSession();
        _sessCache = res;
        _sessCacheAt = Date.now();
        return res;
      } catch(e){
        return null;
      } finally {
        _sessInflight = null;
      }
    })();

    return _sessInflight;
  }

  // expose for other scripts
  window.dokeGetSupabaseSessionSafe = getSessionSafe;

  // Patch sb.auth.getSession/getUser to funnel through safe getter
  function patchSupabaseAuth(){
    const sb = window.sb || window.supabaseClient;
    if(!sb || !sb.auth) return;

    try{
      if(!sb.auth.__doke_patched){
        const origGetSession = sb.auth.getSession?.bind(sb.auth);
        if(origGetSession){
          sb.auth.getSession = async function(){
            const r = await getSessionSafe();
            return r ?? origGetSession();
          };
        }

        const origGetUser = sb.auth.getUser?.bind(sb.auth);
        if(origGetUser){
          sb.auth.getUser = async function(){
            const s = await getSessionSafe();
            const u = s && s.data && s.data.session ? s.data.session.user : null;
            if(u) return { data: { user: u }, error: null };
            return origGetUser();
          };
        }

        sb.auth.__doke_patched = true;
      }
    }catch(_){/* ignore */}
  }

  // ---- fetch timeout + retry (GET only) ----
  const origFetch = window.fetch ? window.fetch.bind(window) : null;
  if(origFetch){
    window.fetch = async function(input, init){
      try{
        const url = (typeof input === 'string') ? input : (input && input.url) ? input.url : '';
        const method = (init && init.method) ? String(init.method).toUpperCase() : (input && input.method) ? String(input.method).toUpperCase() : 'GET';

        // Only touch GET requests to Supabase-ish URLs
        if(method !== 'GET' || !isSupabaseUrl(url)){
          return origFetch(input, init);
        }

        const TIMEOUT_MS = 12000;

        async function attempt(){
          const ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
          const t = ctrl ? setTimeout(()=>{ try{ ctrl.abort(); }catch(_){} }, TIMEOUT_MS) : null;
          const init2 = Object.assign({}, init || {});
          if(ctrl) init2.signal = ctrl.signal;

          try{
            return await origFetch(input, init2);
          } finally {
            if(t) clearTimeout(t);
          }
        }

        // attempt + single retry
        let res;
        try{
          res = await attempt();
        }catch(e){
          res = null;
        }

        if(!res){
          // retry once
          try{ res = await attempt(); }catch(_e){ res = null; }
        }

        if(!res){
          // fall back to original (no timeout) to keep behavior consistent
          return origFetch(input, init);
        }

        // If auth expired (common on mobile Safari), broadcast so the app can react.
        // Do NOT auto-redirect here; leave it to a higher-level guard.
        try{
          if(res && res.status === 401) {
            const s = String(url || '');
            if (s.includes('/auth/v1/')) {
              window.dispatchEvent(new CustomEvent('doke:auth-expired', { detail: { url: s } }));
            }
          }
        } catch(_){ }

        return res;
      } catch(e){
        return origFetch(input, init);
      }
    };
  }

  // Patch as soon as sb exists; also on load
  function tickPatch(){
    try{ patchSupabaseAuth(); }catch(_){ }
  }

  tickPatch();
  window.addEventListener('load', tickPatch);

  // Also patch after supabase-init signals ready
  window.addEventListener('doke:supabase-ready', tickPatch);

})();
