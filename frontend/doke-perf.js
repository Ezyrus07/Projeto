(()=>{
  const KEY_PREFIX = 'doke_cache_v1::';
  const now = ()=> Date.now();

  function qs(sel, root=document){return root.querySelector(sel)}
  function qsa(sel, root=document){return Array.from(root.querySelectorAll(sel))}

  function markLazy(el){
    if(el.classList) el.classList.add('doke-lazy');
  }

  function ensureLoadingAttr(){
    qsa('img:not([loading])').forEach(img=>{ try{ img.loading='lazy'; }catch(_){}});
    qsa('img').forEach(img=>{
      markLazy(img);
      img.addEventListener('load', ()=> img.classList.add('doke-loaded'), {once:true});
      if(img.complete) img.classList.add('doke-loaded');
    });
  }

  function lazySwap(){
    const candidates = qsa('img[data-src],source[data-srcset],video[data-src]');
    if(!candidates.length) return;
    const io = new IntersectionObserver((entries)=>{
      entries.forEach(entry=>{
        if(!entry.isIntersecting) return;
        const el = entry.target;
        try{
          if(el.tagName === 'IMG'){
            if(el.dataset.src){ el.src = el.dataset.src; delete el.dataset.src; }
            if(el.dataset.srcset){ el.srcset = el.dataset.srcset; delete el.dataset.srcset; }
          } else if(el.tagName === 'SOURCE'){
            if(el.dataset.srcset){ el.srcset = el.dataset.srcset; delete el.dataset.srcset; }
          } else if(el.tagName === 'VIDEO'){
            if(el.dataset.src){ el.src = el.dataset.src; delete el.dataset.src; el.load?.(); }
          }
        } catch(_){}
        el.classList?.add('doke-loaded');
        io.unobserve(el);
      });
    }, {rootMargin:'300px 0px'});
    candidates.forEach(el=>{ markLazy(el); io.observe(el); });
  }

  function findFeedContainers(){
    const selectors = [
      '[data-doke-feed]',
      '#feed',
      '.feed',
      '.feed-grid',
      '.publicacoes-grid',
      '.reels-grid',
      '#publicacoes',
      '#reels',
      '#servicos',
      '#anuncios'
    ];
    const set = new Set();
    selectors.forEach(s=> qsa(s).forEach(el=> set.add(el)));
    return Array.from(set);
  }

  function isEmptyFeed(el){
    if(!el) return true;
    const txt = (el.textContent||'').trim();
    if(el.children && el.children.length>0) return false;
    // allow empty-state messages to count as empty
    if(!txt) return true;
    if(/nenhum|mostrando 0|erro ao carregar/i.test(txt)) return true;
    return false;
  }

  function cacheKey(el){
    const id = el.id ? `#${el.id}` : (el.className ? `.${String(el.className).split(/\s+/).slice(0,3).join('.')}` : 'node');
    return KEY_PREFIX + location.pathname + '::' + id;
  }

  function restoreCache(){
    const feeds = findFeedContainers();
    feeds.forEach(el=>{
      try{
        const k = cacheKey(el);
        const raw = sessionStorage.getItem(k);
        if(!raw) return;
        const obj = JSON.parse(raw);
        if(!obj || !obj.html) return;
        if(now() - (obj.ts||0) > 1000*60*10) return; // 10min
        if(isEmptyFeed(el)){
          el.innerHTML = obj.html;
          el.dataset.dokeFromCache = '1';
        }
      } catch(_){}
    });
  }

  function observeCache(){
    const feeds = findFeedContainers();
    const debouncers = new WeakMap();
    feeds.forEach(el=>{
      try{
        const obs = new MutationObserver(()=>{
          let t = debouncers.get(el);
          if(t) clearTimeout(t);
          t = setTimeout(()=>{
            try{
              const html = el.innerHTML;
              if(!html || html.length < 80) return;
              const k = cacheKey(el);
              sessionStorage.setItem(k, JSON.stringify({ts: now(), html}));
            } catch(_){}
          }, 350);
          debouncers.set(el, t);
        });
        obs.observe(el, {childList:true, subtree:true});
      } catch(_){}
    });
  }

  function insertSkeleton(el, count=6){
    if(!el || el.dataset.dokeSkeleton==='0') return;
    if(el.children && el.children.length>0) return;
    // best effort: keep it subtle
    const frag = document.createDocumentFragment();
    for(let i=0;i<count;i++){
      const card = document.createElement('div');
      card.className = 'doke-skel doke-skelCard';
      card.innerHTML = `
        <div class="doke-skel doke-skelMedia"></div>
        <div class="doke-skelMeta">
          <div class="doke-skelLine sm"></div>
          <div class="doke-skelLine"></div>
          <div class="doke-skelLine xs"></div>
        </div>
      `;
      frag.appendChild(card);
    }
    el.appendChild(frag);
  }

  function setupSkeletons(){
    findFeedContainers().forEach(el=>{
      if(isEmptyFeed(el)) insertSkeleton(el, Number(el.dataset.skeletonCount||6));
    });
  }

  function init(){
    ensureLoadingAttr();
    lazySwap();
    restoreCache();
    observeCache();
    setupSkeletons();

    // re-run lazy on new nodes
    const mo = new MutationObserver(()=>{ lazySwap(); ensureLoadingAttr(); });
    mo.observe(document.documentElement, {childList:true, subtree:true});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
