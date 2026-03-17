(function(){
  if ((document.body?.dataset?.page || '') !== 'home') return;

  function q(sel, root){ return (root || document).querySelector(sel); }
  function qa(sel, root){ return Array.from((root || document).querySelectorAll(sel)); }

  function getAdsContainer(){ return document.getElementById('feedAnuncios'); }
  function getPostsContainer(){ return document.getElementById('feed-global-container'); }

  function hasAds(){
    const el = getAdsContainer();
    if (!el) return false;
    return !!q('.card-premium, .card-anuncio, .anuncio-card, .negocio-card, .card', el);
  }
  function hasPosts(){
    const el = getPostsContainer();
    if (!el) return false;
    return !!q('.feed-publicacao-card, .dp-item', el);
  }
  function looksBusy(el){
    if (!el) return false;
    const text = (el.textContent || '').toLowerCase();
    return text.includes('carregando') || text.includes('buscando') || !!q('.skeleton, .pub-skel, .card-skeleton, .feed-skeleton', el);
  }
  function looksEmpty(el){
    if (!el) return true;
    const text = (el.textContent || '').toLowerCase();
    return text.includes('nenhum anúncio') || text.includes('nenhum anuncio') || text.includes('nenhuma publicação') || text.includes('nao foi possivel carregar');
  }

  function setAdsSkeleton(){
    const el = getAdsContainer();
    if (!el || hasAds()) return;
    if (looksBusy(el)) return;
    el.innerHTML = Array.from({length:4}).map(function(){
      return '<article class="card-premium anuncio-card anuncio-skel" aria-hidden="true">'
        + '<div class="skeleton" style="height:180px;border-radius:18px 18px 0 0;"></div>'
        + '<div style="padding:14px;display:grid;gap:10px;">'
        + '<div class="skeleton" style="height:18px;border-radius:999px;width:62%;"></div>'
        + '<div class="skeleton" style="height:14px;border-radius:999px;width:88%;"></div>'
        + '<div class="skeleton" style="height:14px;border-radius:999px;width:54%;"></div>'
        + '</div></article>';
    }).join('');
    el.setAttribute('aria-busy','true');
  }

  function setPostsSkeleton(){
    const el = getPostsContainer();
    if (!el || hasPosts()) return;
    if (looksBusy(el)) return;
    el.classList.add('feed-publicacoes-grid');
    el.innerHTML = Array.from({length:4}).map(function(){
      return '<article class="feed-publicacao-card pub-skel" aria-hidden="true">'
        + '<div class="skeleton" style="height:220px;border-radius:18px 18px 0 0;"></div>'
        + '<div style="padding:14px;display:grid;gap:10px;">'
        + '<div style="display:flex;gap:10px;align-items:center;">'
        + '<div class="skeleton" style="width:34px;height:34px;border-radius:999px;"></div>'
        + '<div class="skeleton" style="height:14px;border-radius:999px;width:120px;"></div>'
        + '</div>'
        + '<div class="skeleton" style="height:18px;border-radius:999px;width:70%;"></div>'
        + '<div class="skeleton" style="height:14px;border-radius:999px;width:92%;"></div>'
        + '</div></article>';
    }).join('');
    el.setAttribute('aria-busy','true');
  }

  async function ensureAds(){
    const el = getAdsContainer();
    if (!el || hasAds()) return;
    setAdsSkeleton();
    try {
      if (typeof window.carregarAnunciosDoFirebase === 'function') {
        await window.carregarAnunciosDoFirebase('');
      }
    } catch (_) {}
    if (!hasAds()) {
      try {
        const list = Array.isArray(window.__dokeAnunciosCacheFull) ? window.__dokeAnunciosCacheFull : [];
        if (list.length && typeof window.dokeBuildCardPremium === 'function') {
          el.innerHTML = '';
          list.slice(0, 8).forEach(function(item){
            const card = window.dokeBuildCardPremium(item);
            if (typeof card === 'string') el.insertAdjacentHTML('beforeend', card);
            else if (card) el.appendChild(card);
          });
        }
      } catch (_) {}
    }
    if (!hasAds() && !looksBusy(el) && looksEmpty(el)) {
      try { el.innerHTML = '<div class="dp-empty">Nenhum anúncio disponível agora.</div>'; } catch (_) {}
    }
    el.setAttribute('aria-busy', hasAds() ? 'false' : 'true');
  }

  async function ensurePosts(){
    const el = getPostsContainer();
    if (!el || hasPosts()) return;
    setPostsSkeleton();
    try {
      if (typeof window.carregarFeedGlobal === 'function') {
        await window.carregarFeedGlobal();
      }
    } catch (_) {}
    if (!hasPosts()) {
      try {
        if (typeof window.__dokeRenderPublicacoesFallbackFromAnuncios === 'function') {
          const rendered = window.__dokeRenderPublicacoesFallbackFromAnuncios(el, 8);
          if (rendered > 0) {
            el.setAttribute('aria-busy', 'false');
            return;
          }
        }
      } catch (_) {}
    }
    if (!hasPosts() && !looksBusy(el) && looksEmpty(el)) {
      try { el.innerHTML = '<div class="dp-empty">Nenhuma publicação disponível agora.</div>'; } catch (_) {}
    }
    el.setAttribute('aria-busy', hasPosts() ? 'false' : 'true');
  }

  let guardRunning = false;
  async function recoverAll(){
    if (guardRunning) return;
    guardRunning = true;
    try {
      await ensureAds();
      await ensurePosts();
    } finally {
      guardRunning = false;
    }
  }

  function scheduleRecovery(){
    [300, 1200, 2500, 5000, 9000].forEach(function(ms){
      setTimeout(function(){
        const ads = getAdsContainer();
        const posts = getPostsContainer();
        if ((ads && !hasAds()) || (posts && !hasPosts())) recoverAll();
      }, ms);
    });
  }

  document.addEventListener('DOMContentLoaded', function(){
    setAdsSkeleton();
    setPostsSkeleton();
    scheduleRecovery();
  }, { once:true });

  window.addEventListener('load', function(){
    recoverAll();
  }, { once:true });

  document.addEventListener('visibilitychange', function(){
    if (document.visibilityState === 'visible') {
      const ads = getAdsContainer();
      const posts = getPostsContainer();
      if ((ads && !hasAds()) || (posts && !hasPosts())) recoverAll();
    }
  });
})();
