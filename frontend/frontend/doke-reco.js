/* DokeReco v1 — ranking + tracking for videos-curtos & publicacoes (TikTok/Reels-like)
   - Requires supabase-js v2 and getSupabaseClient/getSupabasePublicClient from existing codebase.
   - Tables expected (see SQL_ALGORITMO_RECO.sql): doke_engagement_events, doke_content_metrics, doke_user_interest
*/
(function(){
  const DEFAULT_WEIGHTS = {
    retention: 0.45,
    completion: 0.25,
    like: 0.15,
    share: 0.10,
    comment: 0.05,
  };

  function nowISO(){ return new Date().toISOString(); }

  function clamp(n,a,b){ return Math.max(a, Math.min(b,n)); }

  function safeNum(v, d=0){
    const n = Number(v);
    return Number.isFinite(n) ? n : d;
  }

  function smoothRate(num, den, k=10){
    // Laplace-ish smoothing
    return (num + 1) / (den + k);
  }

  function expDecayHours(ageHours, halfLifeHours){
    // exp(-t/halfLife)
    return Math.exp(-Math.max(0, ageHours) / Math.max(1, halfLifeHours));
  }

  function parseHashtags(text){
    if(!text) return [];
    const m = String(text).match(/#([\p{L}\p{N}_]+)/gu);
    if(!m) return [];
    return Array.from(new Set(m.map(s => s.replace(/^#/, '').toLowerCase())));
  }

  function extractTagsFromItem(type, item){
    // Prefer explicit fields if present
    const out = [];
    const push = (v)=>{ if(v) out.push(String(v).toLowerCase()); };

    if(type === 'videos_curtos'){
      push(item?.categoria);
      push(item?.categoria_profissional);
      push(item?.area);
      const txt = [item?.titulo, item?.descricao].filter(Boolean).join(' ');
      out.push(...parseHashtags(txt));
    } else {
      push(item?.categoria);
      push(item?.categoria_profissional);
      const txt = [item?.titulo, item?.descricao, item?.texto, item?.conteudo].filter(Boolean).join(' ');
      out.push(...parseHashtags(txt));
    }

    return Array.from(new Set(out.filter(Boolean)));
  }

  function getItemId(item){
    return String(item?.id || item?.video_id || item?.reel_id || item?.publicacao_id || '').trim();
  }

  function getItemCreator(item){
    return String(item?.user_id || item?.uid || item?.usuario_id || item?.usuarios?.id || item?.usuarios?.uid || '').trim();
  }

  function getCreatedAt(item){
    const v = item?.created_at || item?.dataCriacao || item?.createdAt || item?.data || null;
    if(!v) return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function computeBaseScore(metrics, durationMs){
    const impressions = safeNum(metrics?.impressions, 0);
    const completes = safeNum(metrics?.completes, 0);
    const views = safeNum(metrics?.views, 0);
    const watch = safeNum(metrics?.watch_time_ms, 0);
    const likes = safeNum(metrics?.likes, 0);
    const comments = safeNum(metrics?.comments, 0);
    const shares = safeNum(metrics?.shares, 0);

    const denom = Math.max(1, impressions);

    const completionRate = smoothRate(completes, denom);
    const likeRate = smoothRate(likes, denom);
    const shareRate = smoothRate(shares, denom);
    const commentRate = smoothRate(comments, denom);

    // retention: avg watch ratio. If duration unknown, approximate by views.
    let retention = 0;
    if(durationMs && durationMs > 0){
      retention = clamp(watch / (denom * durationMs), 0, 1.2);
    } else if(views > 0) {
      // fallback: watch per view (cap)
      retention = clamp(watch / Math.max(1, views * 8000), 0, 1.2);
    }

    const w = DEFAULT_WEIGHTS;
    return (
      w.retention * retention +
      w.completion * completionRate +
      w.like * likeRate +
      w.share * shareRate +
      w.comment * commentRate
    );
  }

  async function fetchMetrics(client, contentType, ids){
    if(!client || !ids?.length) return new Map();
    try{
      const { data, error } = await client
        .from('doke_content_metrics')
        .select('content_type, content_id, impressions, views, completes, watch_time_ms, likes, comments, shares, updated_at')
        .eq('content_type', contentType)
        .in('content_id', ids);
      if(error || !Array.isArray(data)) return new Map();
      return new Map(data.map(r => [String(r.content_id), r]));
    }catch(_){
      return new Map();
    }
  }

  async function fetchUserInterest(client, uid){
    if(!client || !uid) return new Map();
    try{
      const { data, error } = await client
        .from('doke_user_interest')
        .select('tag, weight')
        .eq('user_id', uid)
        .order('weight', { ascending: false })
        .limit(80);
      if(error || !Array.isArray(data)) return new Map();
      return new Map(data.map(r => [String(r.tag).toLowerCase(), safeNum(r.weight, 0)]));
    }catch(_){
      return new Map();
    }
  }

  function personalBoost(tagList, interestMap){
    if(!tagList?.length || !interestMap || interestMap.size === 0) return 0;
    let sum = 0;
    let hit = 0;
    for(const t of tagList){
      const w = interestMap.get(String(t).toLowerCase());
      if(w){ sum += w; hit += 1; }
    }
    if(hit === 0) return 0;
    // compress to [0..1]
    const raw = sum / hit;
    return clamp(raw / 5, 0, 1);
  }

  function shuffle(arr){
    const a = arr.slice();
    for(let i=a.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [a[i],a[j]] = [a[j],a[i]];
    }
    return a;
  }

  function interleaveBuckets(buckets, limit){
    const out = [];
    const lastCreators = [];
    const maxSameCreatorStreak = 1;

    while(out.length < limit){
      let picked = false;
      for(const b of buckets){
        if(!b.length) continue;
        // pick first that doesn't repeat creator
        let idx = 0;
        while(idx < b.length){
          const item = b[idx];
          const creator = getItemCreator(item);
          const last = lastCreators[lastCreators.length-1];
          if(!creator || creator !== last){
            out.push(item);
            b.splice(idx,1);
            lastCreators.push(creator);
            if(lastCreators.length > maxSameCreatorStreak) lastCreators.shift();
            picked = true;
            break;
          }
          idx += 1;
        }
        if(picked) break;
      }
      if(!picked){
        // if can't satisfy diversity, just take from first non-empty
        const b = buckets.find(x=>x.length);
        if(!b) break;
        out.push(b.shift());
      }
      if(!buckets.some(x=>x.length)) break;
    }

    return out;
  }

  async function rankAndMix({ client, uid, type, items, limit }){
    const contentType = (type === 'videos_curtos' || type === 'reels') ? 'videos_curtos' : 'publicacoes';
    const L = Math.max(1, limit || items?.length || 24);
    const list = Array.isArray(items) ? items.slice() : [];
    if(list.length === 0) return [];

    const ids = list.map(getItemId).filter(Boolean);
    const metricsMap = await fetchMetrics(client, contentType, ids);
    const interestMap = await fetchUserInterest(client, uid);

    const now = Date.now();
    const scored = list.map(item => {
      const id = getItemId(item);
      const m = metricsMap.get(id) || {};
      const created = getCreatedAt(item);
      const ageHours = created ? (now - created.getTime()) / 3600000 : 9999;
      const base = computeBaseScore(m, safeNum(item?.duration_ms || item?.duracao_ms, 0));
      const fresh = expDecayHours(ageHours, 48);
      const tags = extractTagsFromItem(contentType, item);
      const p = uid ? personalBoost(tags, interestMap) : 0;
      const final = base * (0.7 + 0.3 * fresh) * (0.75 + 0.25 * p);
      return { item, final, base, fresh, p, tags };
    });

    // buckets
    const trending = scored.slice().sort((a,b)=>b.base - a.base).slice(0, Math.ceil(L*0.4)).map(x=>x.item);
    const personalized = scored.slice().sort((a,b)=>b.final - a.final).slice(0, Math.ceil(L*0.7)).map(x=>x.item);
    const fresh = scored.slice().sort((a,b)=>b.fresh - a.fresh).slice(0, Math.ceil(L*0.3)).map(x=>x.item);

    // de-dupe preserving order
    function dedupe(arr){
      const seen = new Set();
      const out = [];
      for(const it of arr){
        const id = getItemId(it);
        if(!id || seen.has(id)) continue;
        seen.add(id);
        out.push(it);
      }
      return out;
    }

    const b1 = dedupe(personalized);
    const b2 = dedupe(trending);
    const b3 = dedupe(shuffle(fresh));

    // mix ratios
    const mix = [
      b1.splice(0, Math.ceil(L*0.60)),
      b2.splice(0, Math.ceil(L*0.25)),
      b3.splice(0, Math.ceil(L*0.15)),
    ];

    return interleaveBuckets(mix, L);
  }

  async function track({ client, uid, type, id, event, watch_time_ms, duration_ms, meta }){
    if(!client || !uid || !id || !event) return;
    const payload = {
      user_id: String(uid),
      content_type: (type === 'videos_curtos' || type === 'reels') ? 'videos_curtos' : 'publicacoes',
      content_id: String(id),
      event_type: String(event),
      watch_time_ms: watch_time_ms == null ? null : Math.round(safeNum(watch_time_ms, 0)),
      duration_ms: duration_ms == null ? null : Math.round(safeNum(duration_ms, 0)),
      meta: meta && typeof meta === 'object' ? meta : null,
      created_at: nowISO(),
    };
    try{
      await client.from('doke_engagement_events').insert(payload);
    }catch(_){/* noop */}
  }

  // Public API
  window.DokeReco = {
    rankAndMix,
    track,
    extractTagsFromItem,
  };
})();
