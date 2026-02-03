/* DOKE UI Components (runtime enhancer)
   - Toast padronizado com “Ver detalhes”
   - Logger leve + captura de erros silenciosos
   - Lazy-load real + skeleton em imagens do feed
   - Infinite scroll (se existir botão 'Ver mais') + cache (sessionStorage)
*/

(function(){
  'use strict';

  const NS = 'DOKE_UI';
  const STORE_KEY = (k)=>`${NS}:${location.pathname}:${k}`;

  /* -----------------------------
   * Toast
   * ---------------------------*/
  function ensureToastHost(){
    let host = document.querySelector('.ui-toast-host');
    if (host) return host;
    host = document.createElement('div');
    host.className = 'ui-toast-host';
    host.setAttribute('role', 'status');
    host.setAttribute('aria-live', 'polite');
    host.setAttribute('aria-atomic', 'true');
    document.body.appendChild(host);
    return host;
  }

  function safeStringify(err){
    try{
      if (typeof err === 'string') return err;
      if (!err) return '';
      if (err instanceof Error) return `${err.name}: ${err.message}\n${err.stack||''}`;
      return JSON.stringify(err, null, 2);
    }catch(_){
      try{ return String(err); }catch(__){ return 'Erro desconhecido'; }
    }
  }

  function uiToast(title, message, opts){
    opts = opts || {};
    const host = ensureToastHost();
    const el = document.createElement('div');
    el.className = 'ui-toast';
    const type = String(opts.type || '').toLowerCase();
    const isError = type === 'error' || type === 'erro' || type === 'warn' || type === 'warning' || /erro|falha|falhou|problema/i.test(String(title || ''));
    el.setAttribute('role', isError ? 'alert' : 'status');
    el.setAttribute('aria-live', isError ? 'assertive' : 'polite');
    el.setAttribute('aria-atomic', 'true');

    const h = document.createElement('h4');
    h.textContent = title || 'Aviso';

    const p = document.createElement('p');
    p.textContent = message || '';

    const actions = document.createElement('div');
    actions.className = 'ui-toast-actions';

    const btnClose = document.createElement('button');
    btnClose.textContent = 'Fechar';
    btnClose.addEventListener('click', ()=>{ el.remove(); });

    actions.appendChild(btnClose);

    const detailsText = opts.details ? safeStringify(opts.details) : '';
    let pre = null;
    if (detailsText){
      const btnDetails = document.createElement('button');
      btnDetails.textContent = 'Ver detalhes';
      btnDetails.addEventListener('click', ()=>{
        el.classList.toggle('is-open');
      });
      actions.insertBefore(btnDetails, btnClose);

      pre = document.createElement('pre');
      pre.textContent = detailsText;
    }

    el.appendChild(h);
    el.appendChild(p);
    el.appendChild(actions);
    if (pre) el.appendChild(pre);

    host.appendChild(el);

    const ttl = Math.max(2500, Math.min(9000, opts.duration || 5200));
    if (!opts.sticky){
      setTimeout(()=>{ if (el.isConnected) el.remove(); }, ttl);
    }

    return el;
  }

  /* -----------------------------
   * Logger
   * ---------------------------*/
  const ring = [];
  function log(kind, msg, data){
    try{
      const item = {
        t: new Date().toISOString(),
        kind: kind || 'info',
        msg: msg || '',
        data: data
      };
      ring.push(item);
      while (ring.length > 50) ring.shift();
      const fn = (kind === 'error') ? console.error : (kind === 'warn') ? console.warn : console.log;
      fn('[DOKE]', msg, data || '');
    }catch(_){
      // ignore
    }
  }

  window.uiToast = window.uiToast || uiToast;
  window.uiLog = window.uiLog || log;
  window.uiGetLogs = window.uiGetLogs || (()=>ring.slice());

  window.addEventListener('error', (ev)=>{
    const details = ev && (ev.error || ev.message || ev);
    uiToast('Erro', 'Algo deu errado. Toque em “Ver detalhes” para ver o erro.', { details, duration: 9000, type: 'error' });
  });

  window.addEventListener('unhandledrejection', (ev)=>{
    const details = ev && (ev.reason || ev);
    uiToast('Erro', 'Falha em uma operação assíncrona. Toque em “Ver detalhes” para ver o erro.', { details, duration: 9000, type: 'error' });
  });

  /* -----------------------------
   * Auto-classes (padronização leve)
   * ---------------------------*/
  function applyUiClasses(root){
    root = root || document;

    // Botões principais
    root.querySelectorAll('button, .dp-btn, .dp-ghost, .dp-save').forEach(btn=>{
      if (btn.classList.contains('no-ui')) return;
      btn.classList.add('ui-btn');
      const txt = (btn.textContent || '').trim().toLowerCase();
      if (btn.classList.contains('dp-save') || txt === 'publicar' || txt === 'salvar') btn.classList.add('ui-btn--primary');
      if (btn.classList.contains('dp-ghost') || txt === 'cancelar') btn.classList.add('ui-btn--ghost');
    });

    // Tabs
    root.querySelectorAll('.dp-tabBtn, .tabs button, .tab button').forEach(t=>{
      t.classList.add('ui-tab');
    });

    // Cards
    root.querySelectorAll('.dp-item, .post-card, .pro-card').forEach(card=>{
      card.classList.add('ui-card');
    });
  }

  /* -----------------------------
   * Lazy-load + skeleton
   * ---------------------------*/
  const imgObs = ('IntersectionObserver' in window)
    ? new IntersectionObserver((entries)=>{
        entries.forEach(e=>{
          if (!e.isIntersecting) return;
          const img = e.target;
          imgObs.unobserve(img);
          const ds = img.getAttribute('data-src');
          if (ds && !img.getAttribute('src')) img.setAttribute('src', ds);
        });
      }, { rootMargin: '240px 0px' })
    : null;

  function enhanceImages(root){
    root = root || document;
    const imgs = root.querySelectorAll('img');
    imgs.forEach(img=>{
      if (!img.hasAttribute('loading')) img.setAttribute('loading', 'lazy');
      if (!img.hasAttribute('decoding')) img.setAttribute('decoding', 'async');

      // Skeleton: aplica no container de mídia do card
      const media = img.closest('.dp-itemMedia, .modal-media-area, .story-media-box');
      if (media && !media.classList.contains('ui-skeleton') && !img.complete){
        media.classList.add('ui-skeleton');
        const cleanup = ()=>{ media.classList.remove('ui-skeleton'); };
        img.addEventListener('load', cleanup, { once:true });
        img.addEventListener('error', cleanup, { once:true });
      }

      // Lazy real com data-src (se alguém usar)
      if (imgObs && img.getAttribute('data-src')){
        imgObs.observe(img);
      }

      // Fallback de imagem quebrada (ícone feio)
      if (!img.dataset.uiErr){
        img.dataset.uiErr = '1';
        img.addEventListener('error', ()=>{
          // evita loop
          if (img.dataset.uiBad === '1') return;
          img.dataset.uiBad = '1';
          img.removeAttribute('src');
          img.style.background = 'linear-gradient(180deg, rgba(0,0,0,.03), rgba(0,0,0,.08))';
        }, { once:true });
      }
    });
  }

  /* -----------------------------
   * Infinite scroll (click automático no “Ver mais”)
   * + Cache de feed (session)
   * ---------------------------*/
  function findLoadMoreButton(){
    return document.querySelector('#btnVerMais, .btn-ver-mais, .dp-loadMore, [data-action="load-more"]');
  }

  function setupInfiniteScroll(){
    const btn = findLoadMoreButton();
    if (!btn || !('IntersectionObserver' in window)) return;

    const sentinel = document.createElement('div');
    sentinel.style.height = '1px';
    sentinel.style.width = '100%';
    sentinel.dataset.uiSentinel = '1';

    // tenta colocar depois do feed, senão depois do botão
    (btn.parentElement || document.body).appendChild(sentinel);

    const obs = new IntersectionObserver((entries)=>{
      entries.forEach(e=>{
        if (!e.isIntersecting) return;
        // se botão estiver escondido, não força
        const style = window.getComputedStyle(btn);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return;
        btn.click();
      });
    }, { rootMargin: '500px 0px' });

    obs.observe(sentinel);
  }

  function setupFeedCache(){
    const container = document.querySelector('#feed-global-container, #areaPublicacoes, .dp-grid');
    if (!container) return;

    // restore
    try{
      const html = sessionStorage.getItem(STORE_KEY('feed_html'));
      const y = sessionStorage.getItem(STORE_KEY('scroll_y'));
      const path = sessionStorage.getItem(STORE_KEY('path'));
      if (html && path === location.pathname && container.children.length < 2){
        container.innerHTML = html;
        if (y) window.scrollTo(0, parseInt(y, 10) || 0);
      }
    }catch(_){ /* ignore */ }

    // save
    window.addEventListener('beforeunload', ()=>{
      try{
        sessionStorage.setItem(STORE_KEY('path'), location.pathname);
        sessionStorage.setItem(STORE_KEY('scroll_y'), String(window.scrollY || 0));
        // cuidado: não salva conteúdo gigante
        const htmlNow = container.innerHTML;
        if (htmlNow && htmlNow.length < 700000){
          sessionStorage.setItem(STORE_KEY('feed_html'), htmlNow);
        }
      }catch(_){ /* ignore */ }
    });
  }

  /* -----------------------------
   * Bootstrap
   * ---------------------------*/
  function boot(){
    try{ applyUiClasses(document); } catch(_){}
    try{ enhanceImages(document); } catch(_){}
    try{ setupInfiniteScroll(); } catch(_){}
    try{ setupFeedCache(); } catch(_){}

    // Mutation: aplica em novos cards
    if ('MutationObserver' in window){
      const mo = new MutationObserver((mutList)=>{
        let touched = false;
        mutList.forEach(m=>{
          if (m.addedNodes && m.addedNodes.length) touched = true;
        });
        if (!touched) return;
        try{ applyUiClasses(document); } catch(_){}
        try{ enhanceImages(document); } catch(_){}
      });
      mo.observe(document.documentElement, { childList:true, subtree:true });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

})();
