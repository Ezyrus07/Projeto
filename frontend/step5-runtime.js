// STEP 5 - Runtime smoothness (safe, global)
// Goals:
// - Reduce background work on mobile Safari (prevents jank / slow loading)
// - Make media lazy by default
// - Provide requestIdleCallback polyfill

(function(){
  'use strict';

  // requestIdleCallback polyfill
  if(typeof window.requestIdleCallback !== 'function'){
    window.requestIdleCallback = function(cb){
      const start = Date.now();
      return setTimeout(function(){
        cb({
          didTimeout: false,
          timeRemaining: function(){
            return Math.max(0, 50 - (Date.now() - start));
          }
        });
      }, 1);
    };
  }
  if(typeof window.cancelIdleCallback !== 'function'){
    window.cancelIdleCallback = function(id){ clearTimeout(id); };
  }

  // Skip interval callbacks when tab is hidden (reduces jank + battery)
  const _setInterval = window.setInterval.bind(window);
  window.setInterval = function(fn, ms){
    const wrapped = function(){
      try{
        if(document.hidden) return;
        return fn();
      }catch(_){ }
    };
    return _setInterval(wrapped, ms);
  };

  // Make images/videos lazy by default (safe)
  function applyLazy(root){
    try{
      const r = root || document;
      const imgs = r.querySelectorAll ? r.querySelectorAll('img:not([loading])') : [];
      imgs.forEach(img=>{
        try{ img.loading = 'lazy'; img.decoding = 'async'; }catch(_){ }
      });

      const vids = r.querySelectorAll ? r.querySelectorAll('video:not([preload])') : [];
      vids.forEach(v=>{
        try{ v.preload = 'metadata'; }catch(_){ }
      });
    }catch(_){ }
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', ()=>{
      applyLazy(document);
      // Observe future nodes
      try{
        const mo = new MutationObserver((muts)=>{
          for(const m of muts){
            for(const n of (m.addedNodes||[])){
              if(n && n.nodeType === 1) applyLazy(n);
            }
          }
        });
        mo.observe(document.documentElement, { childList:true, subtree:true });
      }catch(_){ }
    }, { once:true });
  }else{
    applyLazy(document);
  }

  // Defer heavy work until idle
  window.requestIdleCallback(()=>{
    try{
      // Reduce layout thrash: ensure consistent box sizing
      if(!document.documentElement.classList.contains('doke-step5')){
        document.documentElement.classList.add('doke-step5');
      }
    }catch(_){ }
  });

})();
