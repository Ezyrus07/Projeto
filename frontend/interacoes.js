(() => {
  'use strict';

  const supa = () => window.sb || window.supabaseClient || window.sbClient || window.supabase;

  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  function escapeHtml(str){
    return String(str ?? '')
      .replaceAll('&','&amp;')
      .replaceAll('<','&lt;')
      .replaceAll('>','&gt;')
      .replaceAll('"','&quot;')
      .replaceAll("'",'&#39;');
  }

  function truncate(str, n){
    const s = String(str ?? '').trim();
    if (!s) return '';
    if (s.length <= n) return s;
    return s.slice(0, Math.max(0, n-3)) + '...';
  }

  async function getUserId(){
    const c = supa();
    if (!c?.auth?.getUser) return null;
    try{
      const { data, error } = await c.auth.getUser();
      if (error) return null;
      return data?.user?.id || null;
    }catch(_){
      return null;
    }
  }

  function setBusy(el, busy){
    if (!el) return;
    el.setAttribute('aria-busy', busy ? 'true' : 'false');
  }

  function renderEmpty(el){
    el.innerHTML = `<div class="like-empty">Nada curtido ainda.</div>`;
  }

  function makeItem({ id, kind, title, desc, thumbUrl, isVídeo, openFn, unlikeFn }){
    const card = document.createElement('div');
    card.className = 'like-item';
    card.dataset.kind = kind;
    card.dataset.id = id;

    const thumb = document.createElement('div');
    thumb.className = 'like-thumb';
    thumb.innerHTML = thumbUrl
      ? (isVídeo
          ? `<video muted playsinline preload="metadata" src="${thumbUrl}"></video>`
          : `<img src="${thumbUrl}" loading="lazy" alt="">`)
      : `<img src="https://placehold.co/120x120?text=%20" loading="lazy" alt="">`;

    const info = document.createElement('div');
    info.className = 'like-info';
    info.innerHTML = `
      <p class="like-title">${escapeHtml(truncate(title || 'Sem título', 42))}</p>
      <p class="like-desc">${escapeHtml(truncate(desc || '', 70))}</p>
    `;

    const actions = document.createElement('div');
    actions.className = 'like-actions';
    actions.innerHTML = `
      <button class="cp-more-btn cp-fav-btn is-fav" type="button" aria-label="Descurtir" aria-pressed="true" data-fav-id="${escapeHtml(String(id))}">
        <i class='bx bxs-heart'></i>
      </button>
    `;

    card.appendChild(thumb);
    card.appendChild(info);
    card.appendChild(actions);

    card.addEventListener('click', (ev) => {
      const btn = ev.target.closest('.cp-fav-btn');
      if (btn) return; // handled below
      openFn?.();
    });

    actions.querySelector('.cp-fav-btn')?.addEventListener('click', async (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const ok = await unlikeFn?.();
      if (ok) card.remove();
    });

    return card;
  }

  async function loadPublicacoes(){
    const el = $('#likesPublicacoes');
    setBusy(el, true);
    const c = supa();
    const uid = await getUserId();
    if (!c?.from || !uid){
      setBusy(el, false);
      renderEmpty(el);
      return;
    }
    try{
      const { data: likes, error } = await c
        .from('publicacoes_curtidas')
        .select('publicacao_id')
        .eq('user_id', uid)
        .order('created_at', { ascending: false });
      if (error || !likes?.length){
        setBusy(el, false);
        renderEmpty(el);
        return;
      }
      const ids = likes.map(r => r.publicacao_id).filter(Boolean);
      const { data: pubs, error: e2 } = await c
        .from('publicacoes')
        .select('*')
        .in('id', ids);
      if (e2 || !pubs?.length){
        setBusy(el, false);
        renderEmpty(el);
        return;
      }
      // keep original order
      const map = new Map(pubs.map(p => [String(p.id), p]));
      el.innerHTML = '';
      for (const row of ids){
        const p = map.get(String(row));
        if (!p) continue;
        const title = p.titulo || p.legenda || 'Publicação';
        const desc = p.descricao || (p.titulo ? p.legenda : '') || '';
        const thumb = p.thumb_url || p.media_url || '';
        const isVídeo = String(p.tipo || '').toLowerCase() === 'video';
        el.appendChild(makeItem({
          id: p.id,
          kind: 'publicacoes',
          title,
          desc,
          thumbUrl: thumb,
          isVídeo,
          openFn: () => (typeof window.abrirModalPublicacao === 'function' ? window.abrirModalPublicacao(p.id) : null),
          unlikeFn: async () => {
            const { error: delErr } = await c.from('publicacoes_curtidas').delete().eq('publicacao_id', p.id).eq('user_id', uid);
            return !delErr;
          }
        }));
      }
      if (!el.children.length) renderEmpty(el);
      setBusy(el, false);
    }catch(_){
      setBusy(el, false);
      renderEmpty(el);
    }
  }

  async function loadVídeos(){
    const el = $('#likesVídeos');
    setBusy(el, true);
    const c = supa();
    const uid = await getUserId();
    if (!c?.from || !uid){
      setBusy(el, false);
      renderEmpty(el);
      return;
    }
    try{
      const { data: likes, error } = await c
        .from('videos_curtos_curtidas')
        .select('video_id')
        .eq('user_id', uid)
        .order('created_at', { ascending: false });
      if (error || !likes?.length){
        setBusy(el, false);
        renderEmpty(el);
        return;
      }
      const ids = likes.map(r => r.video_id).filter(Boolean);
      const { data: vids, error: e2 } = await c
        .from('videos_curtos')
        .select('*')
        .in('id', ids);
      if (e2 || !vids?.length){
        setBusy(el, false);
        renderEmpty(el);
        return;
      }
      const map = new Map(vids.map(v => [String(v.id), v]));
      el.innerHTML = '';
      for (const row of ids){
        const v = map.get(String(row));
        if (!v) continue;
        const title = v.titulo || v.descricao || 'Vídeo curto';
        const desc = v.descricao || v.legenda || '';
        const thumb = v.thumb_url || v.capa_url || v.video_url || v.url || '';
        el.appendChild(makeItem({
          id: v.id,
          kind: 'videos',
          title,
          desc,
          thumbUrl: thumb,
          isVídeo: true,
          openFn: () => {
            // abre o viewer original (feed)
            window.location.href = `feed.html?start=sb-${encodeURIComponent(String(v.id))}`;
          },
          unlikeFn: async () => {
            const { error: delErr } = await c.from('videos_curtos_curtidas').delete().eq('video_id', v.id).eq('user_id', uid);
            return !delErr;
          }
        }));
      }
      if (!el.children.length) renderEmpty(el);
      setBusy(el, false);
    }catch(_){
      setBusy(el, false);
      renderEmpty(el);
    }
  }

  async function loadAnuncios(){
    const el = $('#likesAnuncios');
    setBusy(el, true);
    const c = supa();
    const uid = await getUserId();
    if (!c?.from || !uid){
      setBusy(el, false);
      renderEmpty(el);
      return;
    }
    try{
      const { data: likes, error } = await c
        .from('anuncios_curtidas')
        .select('anuncio_id')
        .eq('user_id', uid)
        .order('created_at', { ascending: false });
      if (error || !likes?.length){
        setBusy(el, false);
        renderEmpty(el);
        return;
      }
      const ids = likes.map(r => r.anuncio_id).filter(Boolean);
      const { data: ads, error: e2 } = await c
        .from('anuncios')
        .select('*')
        .in('id', ids);
      if (e2 || !ads?.length){
        setBusy(el, false);
        renderEmpty(el);
        return;
      }
      const map = new Map(ads.map(a => [String(a.id), a]));
      el.innerHTML = '';
      for (const row of ids){
        const a = map.get(String(row));
        if (!a) continue;
        const title = a.titulo || a.nome || 'Anúncio';
        const desc = a.descricao || a.categoria || '';
        const thumb = a.imagem_url || a.imagem || a.foto || a.thumbnail || '';
        el.appendChild(makeItem({
          id: a.id,
          kind: 'anuncios',
          title,
          desc,
          thumbUrl: thumb,
          isVídeo: false,
          openFn: () => { window.location.href = `detalhes.html?id=${encodeURIComponent(String(a.id))}`; },
          unlikeFn: async () => {
            const { error: delErr } = await c.from('anuncios_curtidas').delete().eq('anuncio_id', a.id).eq('user_id', uid);
            return !delErr;
          }
        }));
      }
      if (!el.children.length) renderEmpty(el);
      setBusy(el, false);
    }catch(_){
      setBusy(el, false);
      renderEmpty(el);
    }
  }

  function bindTabs(){
    const buttons = $$('.tab-btn');
    const panels = $$('.tab-panel');
    buttons.forEach(btn => btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      buttons.forEach(b => {
        const on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      panels.forEach(p => p.classList.toggle('is-active', p.dataset.panel === tab));
    }));
  }

  document.addEventListener('DOMContentLoaded', async () => {
    bindTabs();
    await loadPublicacoes();
    await loadVídeos();
    await loadAnuncios();
  });
})();
