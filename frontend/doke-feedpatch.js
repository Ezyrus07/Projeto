// DOKE Feed Patch
// 1) Botão "Ver mais" só aparece quando houver ~5 fileiras de anúncios (adaptativo ao grid).
// 2) Quando não encontra anúncios, substitui o texto simples por um empty state mais bonito.
(() => {
  'use strict';

  // =========================================================
  // Helpers: skeleton + infinite scroll
  // =========================================================
  function buildSkeleton(count = 8){
    const cards = Array.from({length: count}).map(()=>{
      return `
        <div class="doke-skel-card">
          <div class="doke-skel-media"></div>
          <div class="doke-skel-body">
            <div class="doke-skel-line w85"></div>
            <div class="doke-skel-line w60"></div>
            <div class="doke-skel-line w40"></div>
          </div>
        </div>
      `;
    }).join('');
    return `<div class="doke-skel-wrap" data-doke-skeleton="1">${cards}</div>`;
  }

  function showSkeleton(feed){
    if (!feed) return;
    if (feed.querySelector('[data-doke-skeleton="1"]')) return;
    // Só coloca se estiver carregando (spinner ou texto carregando)
    const t = (feed.innerText || '').toLowerCase();
    const looksLoading = t.includes('carregando') || feed.querySelector('.bx-spin') || feed.getAttribute('aria-busy') === 'true';
    if (!looksLoading) return;
    feed.innerHTML = buildSkeleton(10);
  }

  function clearSkeleton(feed){
    if (!feed) return;
    const sk = feed.querySelector('[data-doke-skeleton="1"]');
    if (!sk) return;
    // Se já tem cards reais, remove
    const hasReal = feed.querySelector('.card-premium, .card, .anuncio-card, .card-anuncio');
    if (hasReal) sk.remove();
  }

  function getFeed(){
    return document.getElementById('feedAnuncios');
  }

  function getCols(feed){
    if (!feed) return 1;
    const cs = window.getComputedStyle(feed);
    const gtc = cs.gridTemplateColumns || '';
    if (gtc && gtc !== 'none') {
      const cols = gtc.split(' ').filter(Boolean).length;
      if (cols >= 1) return cols;
    }
    // fallback por largura do primeiro card
    const card = feed.querySelector('.card-premium');
    if (card) {
      const w = card.getBoundingClientRect().width || 0;
      if (w > 0) return Math.max(1, Math.floor(feed.clientWidth / w));
    }
    return Math.max(1, Math.floor(feed.clientWidth / 280));
  }

  function ensureEmptyState(feed){
    if (!feed) return;

    const txt = (feed.innerText || '').trim().toLowerCase();
    const hasNone = txt.includes('nenhum anúncio encontrado') || txt.includes('nenhum anuncio encontrado') || txt.includes('mostrando 0 resultados');
    if (!hasNone) return;

    // Se já foi aplicado, não refaz
    if (feed.querySelector('.doke-empty')) return;

    const termEl = document.querySelector('[id="tituloSecao"], .tituloSecao, #tituloBusca, h2');
    const term = (() => {
      const m = (termEl?.innerText || '').match(/"(.+?)"/);
      return m ? m[1] : '';
    })();

    feed.innerHTML = `
      <div class="doke-empty">
        <div class="doke-empty__icon">🔎</div>
        <div class="doke-empty__title">Nenhum anúncio encontrado</div>
        <div class="doke-empty__subtitle">${term ? `Não achamos resultados para <b>${escapeHtml(term)}</b>.` : 'Tente ajustar seus filtros ou buscar por outro termo.'}</div>
        <div class="doke-empty__actions">
          <button class="doke-empty__btn" type="button" data-empty-action="clear">Limpar filtros</button>
          <button class="doke-empty__btn doke-empty__btn--ghost" type="button" data-empty-action="top">Voltar ao topo</button>
        </div>
        <div class="doke-empty__tips">
          <span class="doke-chip">Use menos palavras</span>
          <span class="doke-chip">Remova filtros</span>
          <span class="doke-chip">Busque por categoria</span>
        </div>
      </div>
    `;

    feed.querySelector('[data-empty-action="clear"]')?.addEventListener('click', () => {
      // tenta limpar campos comuns
      const ids = ['filtroPreco','filtroOrdenacao','filtroTipoPreco','filtroCategoria','inputBusca'];
      ids.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        if (el.tagName === 'SELECT') el.selectedIndex = 0;
        else el.value = '';
      });
      // checkboxes
      ['filtroPgPix','filtroPgCredito','filtroPgDebito'].forEach(id => {
        const el = document.getElementById(id);
        if (el && el.type === 'checkbox') el.checked = false;
      });
      // radios
      const r = document.querySelector('input[name="tipoAtend"][value="todos"]');
      if (r) r.checked = true;

      if (typeof window.aplicarFiltrosBusca === 'function') window.aplicarFiltrosBusca();
      else if (typeof window.carregarAnunciosPremium === 'function') window.carregarAnunciosPremium('');
    });

    feed.querySelector('[data-empty-action="top"]')?.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  function escapeHtml(str){
    return (str ?? '').toString()
      .replaceAll('&','&amp;')
      .replaceAll('<','&lt;')
      .replaceAll('>','&gt;')
      .replaceAll('"','&quot;')
      .replaceAll("'",'&#039;');
  }

  function updateVerMais(){
    const feed = getFeed();
    const btn = document.getElementById('btnVerMaisAnuncios');
    if (!feed || !btn) return;

    const list = Array.isArray(window.__dokeAnunciosListaAtual) ? window.__dokeAnunciosListaAtual : [];
    const cursor = Number(window.__dokeAnunciosCursor || 0);
    const cols = getCols(feed);
    const threshold = Math.max(8, cols * 5);

    const wrap = btn.closest('div') || btn.parentElement;
    // Se nem dá 5 fileiras, some completamente
    if (list.length < threshold) {
      if (wrap) wrap.style.display = 'none';
      return;
    }

    // Caso tenha 5 fileiras ou mais, mantém a lógica do script.js (só aparece se houver mais para carregar)
    if (wrap) wrap.style.display = '';
    btn.style.display = (cursor < list.length) ? '' : 'none';
  }

  function tick(){
    const feed = getFeed();
    showSkeleton(feed);
    clearSkeleton(feed);
    ensureEmptyState(feed);
    updateVerMais();
  }

  // Auto carregar mais quando o botão aparecer (infinite)
  function setupInfinite(){
    const btn = document.getElementById('btnVerMaisAnuncios');
    if (!btn || btn.__dokeInfinite) return;
    btn.__dokeInfinite = true;
    // loaderzinho
    const wrap = btn.closest('div') || btn.parentElement;
    const loader = document.createElement('div');
    loader.className = 'doke-infinite-loader';
    loader.style.display = 'none';
    loader.innerHTML = `<i class='bx bx-loader-alt bx-spin'></i><span>Carregando mais...</span>`;
    wrap?.appendChild(loader);

    let inFlight = false;
    const originalClick = btn.onclick;
    btn.onclick = function(ev){
      if (inFlight) return;
      inFlight = true;
      loader.style.display = '';
      // pequena skeleton ao fim
      const feed = getFeed();
      if (feed && !feed.querySelector('[data-doke-skeleton-tail="1"]')){
        const tail = document.createElement('div');
        tail.setAttribute('data-doke-skeleton-tail','1');
        tail.innerHTML = buildSkeleton(4);
        feed.appendChild(tail);
      }
      try{ originalClick ? originalClick.call(btn, ev) : btn.dispatchEvent(new Event('doke:click')); }catch(e){}
      // observa mudança no cursor/DOM
      const startCursor = Number(window.__dokeAnunciosCursor || 0);
      const t0 = Date.now();
      const check = setInterval(()=>{
        const cur = Number(window.__dokeAnunciosCursor || 0);
        const done = cur > startCursor || Date.now() - t0 > 3000;
        if (!done) return;
        clearInterval(check);
        inFlight = false;
        loader.style.display = 'none';
        const feed2 = getFeed();
        feed2?.querySelector('[data-doke-skeleton-tail="1"]')?.remove();
      }, 120);
    };

    // IntersectionObserver para auto-click
    if ('IntersectionObserver' in window){
      const io = new IntersectionObserver((entries)=>{
        entries.forEach(ent=>{
          if (ent.isIntersecting && btn.style.display !== 'none'){
            // auto carrega sem atrapalhar
            try{ btn.onclick(new Event('click')); }catch(e){}
          }
        });
      }, { root: null, rootMargin: '250px 0px', threshold: 0.01 });
      io.observe(btn);
    }
  }

  function setupToolbar(){
    const bar = document.getElementById('dokeBuscaToolbar');
    if (!bar || bar.__dokeBound) return;
    bar.__dokeBound = true;

    // chips que togglam checkboxes existentes
    bar.querySelectorAll('[data-chip-toggle]')?.forEach(btn=>{
      const id = btn.getAttribute('data-chip-toggle');
      btn.addEventListener('click', ()=>{
        const el = document.getElementById(id);
        if (!el) return;
        if (el.type === 'checkbox') {
          el.checked = !el.checked;
          btn.classList.toggle('is-active', el.checked);
          try{ typeof window.aplicarFiltrosBusca === 'function' && window.aplicarFiltrosBusca(); }catch(e){}
        }
      });
      // inicial
      const el = document.getElementById(id);
      if (el && el.type === 'checkbox') btn.classList.toggle('is-active', !!el.checked);
    });

    // mirror do sort (permite UI mais bonita sem quebrar o filtro antigo)
    const mirror = document.getElementById('dokeSortMirror');
    const real = document.getElementById('filtroOrdenacao');
    if (mirror && real){
      mirror.value = real.value || mirror.value;
      mirror.addEventListener('change', ()=>{
        real.value = mirror.value;
        try{ typeof window.aplicarFiltrosBusca === 'function' && window.aplicarFiltrosBusca(); }catch(e){}
      });
      real.addEventListener('change', ()=>{ mirror.value = real.value; });
    }
  }

  // roda em intervalos curtos (pages mudam conteúdo dinamicamente)
  let n = 0;
  const t = setInterval(() => {
    tick();
    setupInfinite();
    setupToolbar();
    n++;
    if (n > 80) clearInterval(t); // ~20s
  }, 250);

  window.addEventListener('resize', tick);
  document.addEventListener('DOMContentLoaded', tick);
  window.addEventListener('load', tick);
})();