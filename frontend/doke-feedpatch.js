// DOKE Feed Patch
// 1) Botão "Ver mais" só aparece quando houver ~5 fileiras de anúncios (adaptativo ao grid).
// 2) Quando não encontra anúncios, substitui o texto simples por um empty state mais bonito.
(() => {
  'use strict';

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
    ensureEmptyState(getFeed());
    updateVerMais();
  }

  // roda em intervalos curtos (pages mudam conteúdo dinamicamente)
  let n = 0;
  const t = setInterval(() => {
    tick();
    n++;
    if (n > 80) clearInterval(t); // ~20s
  }, 250);

  window.addEventListener('resize', tick);
  document.addEventListener('DOMContentLoaded', tick);
  window.addEventListener('load', tick);
})();