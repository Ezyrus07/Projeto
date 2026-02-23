(() => {
  const page = document.body?.dataset?.page;
  if (page !== 'negocios') return;

  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // ---------- Data (mock/placeholder) ----------
  const CATEGORIAS = [
    { key: 'Todas', icon: 'bx-grid-alt' },
    { key: 'Restaurantes', icon: 'bx-bowl-hot' },
    { key: 'Cafés', icon: 'bx-coffee-togo' },
    { key: 'Mercados', icon: 'bx-store' },
    { key: 'Academias', icon: 'bx-dumbbell' },
    { key: 'Beleza', icon: 'bx-cut' },
    { key: 'Pet', icon: 'bx-dog' },
    { key: 'Farmácias', icon: 'bx-plus-medical' },
    { key: 'Oficinas', icon: 'bx-car' },
    { key: 'Moda', icon: 'bx-t-shirt' },
    { key: 'Tecnologia', icon: 'bx-laptop' },
    { key: 'Eventos', icon: 'bx-calendar-event' }
  ];

  const BIZ = [
    { name: 'Café Central', cat: 'Cafés', rating: 4.8, distance: '1.2 km', aberto: true, entrega: false, cupom: true, tags: ['Brunch', 'Wi‑Fi', 'Pet friendly'] },
    { name: 'Mercado Nova Era', cat: 'Mercados', rating: 4.6, distance: '2.0 km', aberto: true, entrega: true, cupom: false, tags: ['Entrega rápida', '24h'] },
    { name: 'Sushi & Cia', cat: 'Restaurantes', rating: 4.7, distance: '3.5 km', aberto: false, entrega: true, cupom: true, tags: ['Delivery', 'Combos'] },
    { name: 'PowerFit', cat: 'Academias', rating: 4.5, distance: '900 m', aberto: true, entrega: false, cupom: false, tags: ['Aula experimental', 'Musculação'] },
    { name: 'Studio Bella', cat: 'Beleza', rating: 4.9, distance: '1.8 km', aberto: true, entrega: false, cupom: true, tags: ['Corte', 'Escova', 'Unhas'] },
    { name: 'PetHouse', cat: 'Pet', rating: 4.4, distance: '4.1 km', aberto: false, entrega: true, cupom: false, tags: ['Banho & Tosa', 'Rações'] },
    { name: 'Farmácia Saúde+', cat: 'Farmácias', rating: 4.6, distance: '650 m', aberto: true, entrega: true, cupom: true, tags: ['Entrega', 'Genéricos'] },
    { name: 'Oficina M3', cat: 'Oficinas', rating: 4.3, distance: '5.2 km', aberto: true, entrega: false, cupom: false, tags: ['Revisão', 'Troca de óleo'] },
  ];

  const VIDEOS = [
    { title: 'Tour do Café Central', cat: 'Cafés', biz: 'Café Central', seconds: 18 },
    { title: 'Fila agora no Mercado', cat: 'Mercados', biz: 'Mercado Nova Era', seconds: 12 },
    { title: 'Sushi saindo do forno', cat: 'Restaurantes', biz: 'Sushi & Cia', seconds: 20 },
    { title: 'Treino rápido (PowerFit)', cat: 'Academias', biz: 'PowerFit', seconds: 15 },
    { title: 'Antes e depois (Studio)', cat: 'Beleza', biz: 'Studio Bella', seconds: 22 },
    { title: 'Banho & tosa em 15s', cat: 'Pet', biz: 'PetHouse', seconds: 16 },
  ];

  // Public demo MP4 (small). Replace with real reels when integrar.
  const DEMO_VIDEO_URL = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';

  // ---------- Helpers ----------
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  function svgDataUri(svg) {
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  function makeCover(label, sub) {
    const safe1 = (label || 'Doke').slice(0, 18);
    const safe2 = (sub || '').slice(0, 22);
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="540" height="960" viewBox="0 0 540 960">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#0b7768"/>
            <stop offset="1" stop-color="#2a5f90"/>
          </linearGradient>
          <filter id="s" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="18" stdDeviation="20" flood-color="#000" flood-opacity="0.28"/>
          </filter>
        </defs>
        <rect width="540" height="960" fill="url(#g)"/>
        <circle cx="420" cy="180" r="220" fill="#ffffff" opacity="0.10"/>
        <circle cx="120" cy="760" r="260" fill="#ffffff" opacity="0.10"/>
        <g filter="url(#s)">
          <rect x="52" y="650" rx="26" ry="26" width="436" height="220" fill="#ffffff" opacity="0.18"/>
        </g>
        <text x="80" y="720" fill="#fff" font-size="44" font-family="Inter, Arial" font-weight="800">${safe1}</text>
        <text x="80" y="780" fill="#eaf7f5" font-size="26" font-family="Inter, Arial" font-weight="600">${safe2}</text>
        <text x="80" y="840" fill="#eaf7f5" font-size="22" font-family="Inter, Arial" opacity="0.9">doke • negócios</text>
      </svg>
    `.trim();
    return svgDataUri(svg);
  }

  function makeAvatar(letter) {
    const L = (letter || 'D').toUpperCase().slice(0, 1);
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#2a5f90"/>
            <stop offset="1" stop-color="#0b7768"/>
          </linearGradient>
        </defs>
        <circle cx="40" cy="40" r="40" fill="url(#g)"/>
        <text x="40" y="52" text-anchor="middle" fill="#fff" font-size="34" font-family="Inter, Arial" font-weight="800">${L}</text>
      </svg>
    `.trim();
    return svgDataUri(svg);
  }

  function setupScrollNav(track, prevBtn, nextBtn) {
    if (!track) return;

    const step = () => clamp(Math.floor(track.clientWidth * 0.85), 240, 980);

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        track.scrollBy({ left: -step(), behavior: 'smooth' });
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        track.scrollBy({ left: step(), behavior: 'smooth' });
      });
    }

    // Drag scroll (mouse/touch)
    let isDown = false;
    let startX = 0;
    let startScrollLeft = 0;

    const down = (e) => {
      isDown = true;
      track.classList.add('dragging');
      startX = (e.touches ? e.touches[0].pageX : e.pageX);
      startScrollLeft = track.scrollLeft;
    };
    const move = (e) => {
      if (!isDown) return;
      const x = (e.touches ? e.touches[0].pageX : e.pageX);
      const walk = (x - startX);
      track.scrollLeft = startScrollLeft - walk;
    };
    const up = () => {
      isDown = false;
      track.classList.remove('dragging');
    };

    track.addEventListener('mousedown', down);
    track.addEventListener('mousemove', move);
    track.addEventListener('mouseleave', up);
    track.addEventListener('mouseup', up);

    track.addEventListener('touchstart', down, { passive: true });
    track.addEventListener('touchmove', move, { passive: true });
    track.addEventListener('touchend', up);
  }

  function slug(s) {
    return String(s || 'doke')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '')
      .slice(0, 16) || 'doke';
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function iconByCategory(cat) {
    const map = {
      'Restaurantes': 'bx-bowl-hot',
      'Cafés': 'bx-coffee-togo',
      'Mercados': 'bx-store',
      'Academias': 'bx-dumbbell',
      'Beleza': 'bx-cut',
      'Pet': 'bx-dog',
      'Farmácias': 'bx-plus-medical',
      'Oficinas': 'bx-car',
      'Moda': 'bx-t-shirt',
      'Tecnologia': 'bx-laptop',
      'Eventos': 'bx-calendar-event'
    };
    return map[cat] || 'bx-store';
  }

  // ---------- State ----------
  let state = {
    cat: 'Todas',
    chips: new Set(),
    q: ''
  };

  // ---------- Render: Categories ----------
  function renderCategorias() {
    const track = qs('#listaCategoriasNegocios');
    if (!track) return;

    track.innerHTML = '';

    CATEGORIAS.forEach((c) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cat-card';
      btn.dataset.cat = c.key;
      btn.setAttribute('role', 'listitem');
      btn.innerHTML = `
        <div class="cat-circle" aria-hidden="true">
          <i class='bx ${c.icon} cat-icon' aria-hidden="true"></i>
        </div>
        <div class="cat-name" title="${escapeHtml(c.key)}">${escapeHtml(c.key)}</div>
      `;
      btn.addEventListener('click', () => setCategoria(c.key));
      track.appendChild(btn);
    });

    // default active
    const first = track.querySelector('.cat-card');
    if (first) first.classList.add('is-selected');

    setupScrollNav(track, qs('.bizcat-prev'), qs('.bizcat-next'));
  }

  // ---------- Render: Videos (demo) ----------
  function renderVideos() {
    const wrap = qs('#galeria-videos-negócios');
    if (!wrap) return;

    wrap.innerHTML = '';

    VIDEOS.forEach((v, idx) => {
      const card = document.createElement('div');
      card.className = 'tiktok-card';
      card.tabIndex = 0;
      card.setAttribute('role', 'listitem');

      const cover = makeCover(v.biz, v.title);
      const avatar = makeAvatar(v.biz?.[0] || 'D');

      card.innerHTML = `
        <img class="video-bg" src="${cover}" alt="" loading="lazy" decoding="async"/>
        <div class="tiktok-play-btn" aria-hidden="true"><i class='bx bx-play'></i></div>
        <span class="card-badge-online">${idx === 0 ? 'EM ALTA' : escapeHtml(v.cat)}</span>
        <div class="video-ui-layer">
          <div class="provider-info">
            <div class="provider-avatar"><img src="${avatar}" alt="" loading="lazy" decoding="async"/></div>
            <span class="provider-name">${escapeHtml(v.biz)}</span>
          </div>
          <p class="video-description">${escapeHtml(v.title)}</p>
          <div class="yt-chip-row">
            <span class="yt-chip">${escapeHtml(v.cat)}</span>
            <span class="yt-chip">${escapeHtml(String(v.seconds))}s</span>
          </div>
          <button class="btn-orcamento-card" type="button">Assistir</button>
        </div>
      `;

      const open = () => abrirDemoVideo({
        video: DEMO_VIDEO_URL,
        avatar,
        username: `@${slug(v.biz)}`,
        desc: `${v.title} • ${v.biz} • ${v.cat}`
      });

      card.addEventListener('click', (e) => {
        const isBtn = e.target?.closest?.('.btn-orçamento-card');
        if (isBtn || e.target?.closest?.('.tiktok-play-btn') || e.target?.closest?.('.video-ui-layer')) {
          open();
        }
      });
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open();
        }
      });

      wrap.appendChild(card);
    });

    setupScrollNav(wrap, qs('.bizvid-prev'), qs('.bizvid-next'));
  }

  // ---------- Demo modal (no DB) ----------
  function abrirDemoVideo({ video, avatar, username, desc }) {
    const modal = qs('#modalPlayerVideo');
    const player = qs('#playerPrincipal');
    if (!modal || !player) return;

    // hide navigation arrows (demo)
    qsa('#modalPlayerVideo .nav-arrow').forEach((b) => (b.style.display = 'none'));

    // hide actions + comment box (demo)
    const footer = qs('#modalPlayerVideo .modal-footer-actions');
    if (footer) footer.style.display = 'none';

    const inputBox = qs('#inputComentarioReel');
    if (inputBox) {
      const row = inputBox.closest('div');
      if (row) row.style.display = 'none';
    }

    const comments = qs('#listaComentariosReel');
    if (comments) {
      comments.innerHTML = '<div style="color:#7a8796; padding: 10px 0;">Comentários e curtidas (demo) serão integrados quando conectar os reels de negócios.</div>';
    }

    const avatarEl = qs('#reelAvatar');
    const userEl = qs('#reelUsername');
    const descEl = qs('#reelDesc');

    if (avatarEl) avatarEl.src = avatar || '';
    if (userEl) userEl.textContent = username || '@doke';
    if (descEl) descEl.textContent = desc || '';

    player.pause();
    player.src = video;
    player.currentTime = 0;
    player.muted = false;

    modal.style.display = 'flex';

    // attempt autoplay (mobile may block)
    player.play().catch(() => {});
  }

  // ---------- Filtering ----------
  function setCategoria(cat) {
    state.cat = cat;
    const title = qs('#tituloNegocios');
    if (title) title.textContent = cat === 'Todas' ? 'Negócios em destaque' : `Negócios • ${cat}`;

    const track = qs('#listaCategoriasNegocios');
    if (track) {
      qsa('.cat-card', track).forEach((b) => {
        b.classList.toggle('is-selected', b.dataset.cat === cat);
      });
    }

    applyFilters();
  }

  function toggleChip(key) {
    if (state.chips.has(key)) state.chips.delete(key);
    else state.chips.add(key);

    qsa('.neg-chipbar .chip').forEach((btn) => {
      btn.classList.toggle('is-active', state.chips.has(btn.dataset.filter));
    });

    applyFilters();
  }

  function match(b) {
    if (state.cat !== 'Todas' && b.cat !== state.cat) return false;

    if (state.chips.has('aberto') && !b.aberto) return false;
    if (state.chips.has('entrega') && !b.entrega) return false;
    if (state.chips.has('cupom') && !b.cupom) return false;
    if (state.chips.has('4plus') && b.rating < 4.5) return false;

    const q = state.q.trim().toLowerCase();
    if (q) {
      const hay = [b.name, b.cat, ...(b.tags || [])].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }

    return true;
  }

  function renderBusinesses(list) {
    const grid = qs('#negociosGrid');
    const empty = qs('#negociosEmpty');
    if (!grid) return;

    grid.innerHTML = '';

    if (!list.length) {
      if (empty) empty.style.display = 'block';
      return;
    }
    if (empty) empty.style.display = 'none';

    list.forEach((b) => {
      const card = document.createElement('article');
      card.className = 'biz-card';
      card.setAttribute('role', 'listitem');
      card.dataset.cat = b.cat;

      const status = b.aberto ? '<span class="biz-status on">ABERTO</span>' : '<span class="biz-status off">FECHADO</span>';
      const star = `<i class='bx bxs-star' aria-hidden="true"></i> ${b.rating.toFixed(1)}`;

      const tags = (b.tags || []).slice(0, 3).map(t => `<span class="biz-tag">${escapeHtml(t)}</span>`);
      if (b.entrega) tags.push('<span class="biz-tag biz-tag-flag">Entrega</span>');
      if (b.cupom) tags.push('<span class="biz-tag biz-tag-flag">Cupom</span>');

      card.innerHTML = `
        <div class="biz-card-head">
          <div class="biz-logo" aria-hidden="true"><i class='bx ${iconByCategory(b.cat)}'></i></div>
          ${status}
        </div>

        <div class="biz-name" title="${escapeHtml(b.name)}">${escapeHtml(b.name)}</div>

        <div class="biz-meta">
          <span class="biz-meta-item biz-meta-star">${star}</span>
          <span class="biz-meta-sep">•</span>
          <span class="biz-meta-item">${escapeHtml(b.distance)}</span>
          <span class="biz-meta-sep">•</span>
          <span class="biz-meta-item">${escapeHtml(b.cat)}</span>
        </div>

        <div class="biz-tags">${tags.join('')}</div>

        <div class="biz-actions">
          <button class="biz-btn biz-btn-primary" type="button">Ver perfil</button>
          <button class="biz-btn biz-btn-outline" type="button">Rotas</button>
        </div>
      `;

      qsa('button', card).forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (window.dokeToast) window.dokeToast('Função demo — conecte aos perfis/rotas quando integrar o back-end.');
        });
      });

      grid.appendChild(card);
    });
  }

  function applyFilters() {
    const list = BIZ.filter(match);
    renderBusinesses(list);
  }

  function bindFilters() {
    qsa('.neg-chipbar .chip').forEach((btn) => {
      btn.addEventListener('click', () => toggleChip(btn.dataset.filter));
    });

    const btnClear = qs('#btnLimparFiltros');
    if (btnClear) {
      btnClear.addEventListener('click', () => {
        state.cat = 'Todas';
        state.chips = new Set();
        state.q = '';

        const input = qs('#inputBuscaNegocios');
        if (input) input.value = '';

        const title = qs('#tituloNegocios');
        if (title) title.textContent = 'Negócios em destaque';

        qsa('.neg-chipbar .chip').forEach((b) => b.classList.remove('is-active'));

        const track = qs('#listaCategoriasNegocios');
        if (track) {
          qsa('.cat-card', track).forEach((b, i) => b.classList.toggle('is-selected', i === 0));
        }

        applyFilters();
      });
    }

    const input = qs('#inputBuscaNegocios');
    const btn = qs('#btnBuscarNegocios');

    const doSearch = () => {
      state.q = (input?.value || '').trim();
      applyFilters();
    };

    if (input) {
      input.addEventListener('input', () => {
        window.clearTimeout(input.__t);
        input.__t = window.setTimeout(doSearch, 140);
      });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') doSearch();
      });
    }
    if (btn) btn.addEventListener('click', doSearch);

    const btnProcurar = qs('#btnProcurarNegocios');
    if (btnProcurar) btnProcurar.addEventListener('click', doSearch);
  }

  // ---------- Init ----------
  function init() {
    renderCategorias();
    renderVideos();
    bindFilters();
    applyFilters();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
