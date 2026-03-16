/* STEP6_CACHE_LAYER (safe, GET-only) */
(function(){
  try {
    if (window.__DOKE_STEP6_CACHE__) return;
    window.__DOKE_STEP6_CACHE__ = true;

    const ORIGIN = location.origin;
    const MEM = new Map(); // key -> {t, ttl, res}
    const INFLIGHT = new Map(); // key -> Promise<Response>
    const MAX_MEM = 60;
    const DEFAULT_TTL = 15000; // 15s
    const SS_KEY = "__doke_http_cache_v1__";
    const SS_MAX = 40;

    function now(){ return Date.now(); }

    function isSupabaseDataUrl(url){
      try{
        const u = new URL(url, ORIGIN);
        const p = u.pathname || "";
        // Cache only data endpoints. Never cache auth endpoints.
        if (p.includes("/auth/v1/")) return false;
        if (p.includes("/rest/v1/")) return true;
        if (p.includes("/storage/v1/")) return true;
        if (p.includes("/functions/v1/")) return true;
        // Some projects proxy through local paths
        if (p.startsWith("/rest/v1/") || p.startsWith("/storage/v1/") || p.startsWith("/functions/v1/")) return true;
        // Heuristic: Supabase domains
        if ((u.hostname || "").includes("supabase") && (p.includes("/v1/") || p.includes("/rest/"))) return true;
        return false;
      }catch(e){ return false; }
    }

    function normAuth(headers){
      try{
        if (!headers) return "";
        // Authorization header makes the response user-specific
        const a = headers.get ? headers.get("authorization") : (headers["authorization"]||headers["Authorization"]||"");
        return (a||"").slice(0, 48); // avoid huge keys
      }catch(e){ return ""; }
    }

    function makeKey(input, init){
      try{
        const url = (typeof input === "string") ? input : (input && input.url ? input.url : String(input));
        const method = (init && init.method) ? String(init.method).toUpperCase() : (input && input.method ? String(input.method).toUpperCase() : "GET");
        // Only GET
        const hdrs = (init && init.headers) ? (init.headers instanceof Headers ? init.headers : new Headers(init.headers)) :
                     (input && input.headers ? (input.headers instanceof Headers ? input.headers : new Headers(input.headers)) : new Headers());
        const auth = normAuth(hdrs);
        return method + "::" + url + "::" + auth;
      }catch(e){ return ""; }
    }

    function getSS(){
      try{
        const raw = sessionStorage.getItem(SS_KEY);
        if(!raw) return [];
        const arr = JSON.parse(raw);
        if(Array.isArray(arr)) return arr;
        return [];
      }catch(e){ return []; }
    }
    function setSS(arr){
      try{ sessionStorage.setItem(SS_KEY, JSON.stringify(arr)); }catch(e){}
    }

    function ssGet(key){
      const arr = getSS();
      const t = now();
      for (const it of arr){
        if(it && it.k === key){
          if(t - it.t <= (it.ttl||DEFAULT_TTL)){
            return it;
          }
        }
      }
      return null;
    }

    function ssPut(key, payload){
      const arr = getSS().filter(Boolean);
      // remove existing
      const filtered = arr.filter(it => it.k !== key);
      filtered.unshift(payload);
      if(filtered.length > SS_MAX) filtered.length = SS_MAX;
      setSS(filtered);
    }

    function memGet(key){
      const it = MEM.get(key);
      if(!it) return null;
      if(now() - it.t > it.ttl){
        MEM.delete(key);
        return null;
      }
      return it;
    }

    function memPut(key, payload){
      MEM.set(key, payload);
      // trim
      if(MEM.size > MAX_MEM){
        const keys = Array.from(MEM.keys());
        for(let i=0;i<keys.length - MAX_MEM;i++){
          MEM.delete(keys[i]);
        }
      }
    }

    async function cloneToPayload(res){
      const text = await res.clone().text();
      const headers = {};
      res.headers.forEach((v,k)=>{ headers[k]=v; });
      return { status: res.status, statusText: res.statusText, headers, body: text };
    }

    function payloadToResponse(p){
      try{
        return new Response(p.body, { status: p.status, statusText: p.statusText, headers: p.headers });
      }catch(e){
        return new Response(p.body || "", { status: 200 });
      }
    }

    const _fetch = window.fetch.bind(window);

    window.fetch = function(input, init){
      try{
        const url = (typeof input === "string") ? input : (input && input.url ? input.url : "");
        const method = (init && init.method) ? String(init.method).toUpperCase() : (input && input.method ? String(input.method).toUpperCase() : "GET");
        if(method !== "GET" || !url || !isSupabaseDataUrl(url)){
          return _fetch(input, init);
        }

        const key = makeKey(input, init);
        if(!key) return _fetch(input, init);

        // Singleflight
        if(INFLIGHT.has(key)) return INFLIGHT.get(key);

        // Memory cache
        const m = memGet(key);
        if(m && m.res){
          return Promise.resolve(payloadToResponse(m.res));
        }

        // Session cache
        const s = ssGet(key);
        if(s && s.res){
          memPut(key, {t:s.t, ttl:s.ttl||DEFAULT_TTL, res:s.res});
          return Promise.resolve(payloadToResponse(s.res));
        }

        const ttl = DEFAULT_TTL;

        const p = _fetch(input, init).then(async (res)=>{
          try{
            // cache only successful-ish responses
            if(res && (res.status === 200 || res.status === 206)){
              const payload = await cloneToPayload(res);
              const entry = { k:key, t: now(), ttl, res: payload };
              memPut(key, {t: entry.t, ttl, res: payload});
              ssPut(key, entry);
            }
          }catch(e){}
          return res;
        }).finally(()=>{ INFLIGHT.delete(key); });

        INFLIGHT.set(key, p);
        return p;
      }catch(e){
        return _fetch(input, init);
      }
    };

  } catch(e){}
})();