(() => {
  const key = "__DOKE_V2_PAGE_SOCIAL__";
  if (window[key]) return;

  const bridge = () => window.__DOKE_V2_PAGE_NATIVE_BRIDGE__ || {};

  const ROUTES = {
    "comunidade.html": {
      title: "Comunidades",
      eyebrow: "Superfície social",
      description: "Explore grupos, assuntos e comunidades em uma navegação mais fluida.",
      highlight: ["Grupos", "Explorar", "Interação"],
      type: "community"
    },
    "grupo.html": {
      title: "Grupo",
      eyebrow: "Superfície social",
      description: "Feed do grupo, membros e composição de posts com shell nativa e transição estável.",
      highlight: ["Feed", "Membros", "Posts"],
      type: "group"
    },
    "meuperfil.html": {
      title: "Meu perfil",
      eyebrow: "Perfil",
      description: "Seu perfil com capa, publicações e informações principais em uma camada estável.",
      highlight: ["Perfil", "Conteúdo", "Métricas"],
      type: "profile"
    },
    "perfil-profissional.html": {
      title: "Perfil profissional",
      eyebrow: "Perfil",
      description: "Seu perfil profissional com serviços, avaliações e apresentação em uma navegação fluida.",
      highlight: ["Serviços", "Avaliações", "Portfólio"],
      type: "profile"
    },
    "perfil.html": {
      title: "Perfil",
      eyebrow: "Perfil",
      description: "Página de perfil geral com shell nativa, hero uniforme e reaproveitamento do conteúdo legado.",
      highlight: ["Resumo", "Posts", "Atividade"],
      type: "profile"
    },
    "perfil-cliente.html": {
      title: "Perfil do cliente",
      eyebrow: "Perfil",
      description: "Visão social do cliente com conteúdo central reaproveitado dentro da superfície nativa do app-v2.",
      highlight: ["Cliente", "Pedidos", "Atividade"],
      type: "profile"
    },
    "perfil-usuario.html": {
      title: "Perfil do usuário",
      eyebrow: "Perfil",
      description: "Perfil público com layout nativo, cards uniformes e transição estável do miolo.",
      highlight: ["Perfil", "Conexões", "Conteúdo"],
      type: "profile"
    },
    "perfil-empresa.html": {
      title: "Perfil da empresa",
      eyebrow: "Perfil",
      description: "Apresentacao institucional, servicos e prova social da empresa dentro da shell nativa do app-v2.",
      highlight: ["Empresa", "Servicos", "Reputacao"],
      type: "profile"
    },
    "feed.html": {
      title: "Feed",
      eyebrow: "Superfície social",
      description: "Fluxo de conteúdo com shell nativa, skeleton estável e reaproveitamento do HTML central legado.",
      highlight: ["Feed", "Posts", "Descoberta"],
      type: "feed"
    },
    "publicacoes.html": {
      title: "Publicações",
      eyebrow: "Superfície social",
      description: "Listagem de publicações e conteúdo do usuário dentro de uma superfície social mais consistente no v2.",
      highlight: ["Posts", "Mídia", "Engajamento"],
      type: "feed"
    },
    "interacoes.html": {
      title: "Interações",
      eyebrow: "Superfície social",
      description: "Comentários, curtidas e sinais de engajamento com shell nativa e transição mais estável.",
      highlight: ["Comentários", "Curtidas", "Engajamento"],
      type: "feed"
    }
  };

  function normalizeFile(path) {
    return (bridge().normalizeFile ? bridge().normalizeFile(path) : String(path || '').toLowerCase().split('/').pop() || 'index.html');
  }

  function metricsHtml(items) {
    return (items || []).map((item) => `<span class="doke-v2-social-pill">${item}</span>`).join('');
  }

  function firstText(el, selectors) {
    for (const sel of selectors) {
      const node = el.querySelector(sel);
      const value = String(node?.textContent || '').replace(/\s+/g, ' ').trim();
      if (value) return value;
    }
    return '';
  }

  function normalizeInjectedContent(content, type) {
    if (!(content instanceof HTMLElement)) return;
    content.querySelectorAll('main, .dp-wrap, .container-principal').forEach((node) => {
      if (node instanceof HTMLElement) node.classList.add('doke-v2-social-main');
    });
    content.querySelectorAll('.comm-hero-container, .grupo-hero, .dp-hero, .hero-negocios, .perfil-header-card, .perfil-hero, .cover').forEach((node) => {
      if (node instanceof HTMLElement) node.classList.add('doke-v2-hero');
    });
    content.querySelectorAll('.grid-comunidades, .dp-grid, .grupo-layout, .lista-cards-premium').forEach((node) => {
      if (node instanceof HTMLElement) node.classList.add('doke-v2-social-grid');
    });
    content.querySelectorAll('.com-card, .grupo-card, .dp-card, .card, .stat-card, .analytics-card').forEach((node) => {
      if (node instanceof HTMLElement) node.classList.add('doke-v2-social-card');
    });
    if (type === 'community') {
      content.classList.add('is-community');
      const legacyHero = content.querySelector('.comm-hero-container');
      if (legacyHero instanceof HTMLElement) legacyHero.removeAttribute('hidden');
      content.querySelectorAll('.tab-btn').forEach((button) => {
        if (!(button instanceof HTMLElement)) return;
        const label = String(button.textContent || '').trim();
        if (/voc/i.test(label)) button.textContent = 'Perto de voce';
        if (/condom/i.test(label)) button.textContent = 'Condominios';
      });
    } else if (type === 'profile') {
      const legacyHero = content.querySelector('.perfil-header-card, .perfil-hero, .cover');
      if (legacyHero instanceof HTMLElement) legacyHero.removeAttribute('hidden');
      content.classList.add('is-profile');
    } else if (type === 'group') {
      content.classList.add('is-group');
    } else if (type === 'feed') {
      content.classList.add('is-feed');
    }
  }

  function hasLocalAuth() {
    try {
      const raw = localStorage.getItem('doke_usuario_perfil') || localStorage.getItem('perfil_usuario') || '';
      const parsed = raw ? JSON.parse(raw) : null;
      const hasFlag = ['usuarioLogado','logado','isLoggedIn','doke_logged_in'].some((key) => String(localStorage.getItem(key) || '').toLowerCase() === 'true');
      const hasIdentity = !!String(parsed?.uid || parsed?.id || parsed?.email || localStorage.getItem('doke_uid') || '').trim();
      const backup = String(localStorage.getItem('doke_auth_session_backup') || '').trim();
      const tokenKey = Object.keys(localStorage || {}).find((key) => /^sb-[a-z0-9-]+-auth-token$/i.test(String(key || '')));
      let hasSbToken = false;
      if (tokenKey) { try { const raw=localStorage.getItem(tokenKey)||''; const obj=raw?JSON.parse(raw):null; const expiresAt=Number(obj?.expires_at || obj?.expiresAt || obj?.currentSession?.expires_at || 0); const access=String(obj?.access_token || obj?.currentSession?.access_token || '').trim(); hasSbToken=!!(access && (!expiresAt || expiresAt*1000 > Date.now())); } catch(_e) {} }
      const hasCookie = String(document.cookie || '').includes('doke_dev_session=');
      return !!(hasFlag && hasIdentity && (backup || hasSbToken || hasCookie || window.auth?.currentUser?.uid));
    } catch (_e) {
      return false;
    }
  }

  function readProfileSnapshot() {
    const snap = window.__DOKE_V2_AUTH_SNAPSHOT__;
    if (snap?.profile && typeof snap.profile === 'object') return snap.profile;
    const keys = ['doke_usuario_perfil', 'perfil_usuario', 'usuario_logado', 'doke_usuario_logado', 'userLogado'];
    for (const key of keys) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
      } catch (_e) {}
    }
    return {};
  }

  function formatPoints(value) {
    const num = Math.max(0, Number(value) || 0);
    return new Intl.NumberFormat('pt-BR').format(num);
  }

  function buildProgressState() {
    const profile = readProfileSnapshot();
    const authenticated = hasLocalAuth();
    const rawPoints = Number(
      profile.pontos ??
      profile.points ??
      profile.xpTotal ??
      profile.xp_total ??
      profile.score ??
      (authenticated ? 12450 : 0)
    ) || 0;
    const rawLevel = Math.max(1, Number(
      profile.nivel ??
      profile.level ??
      profile.lv ??
      (authenticated ? Math.floor(rawPoints / 520) + 1 : 1)
    ) || 1);
    const currentXp = Math.max(0, Number(
      profile.xpAtual ??
      profile.currentXp ??
      profile.xp_atual ??
      (rawPoints % 1000)
    ) || 0);
    const nextXp = Math.max(1000, Number(
      profile.proximoNivelXp ??
      profile.nextLevelXp ??
      profile.xp_proximo_nivel ??
      1000
    ) || 1000);
    const pct = Math.max(0, Math.min(100, (currentXp / nextXp) * 100));
    return {
      pointsLabel: formatPoints(rawPoints),
      levelLabel: String(rawLevel),
      xpLabel: `${formatPoints(currentXp)} / ${formatPoints(nextXp)} XP`,
      progressPct: pct.toFixed(2)
    };
  }

  function buildProfileProgressMarkup() {
    const progress = buildProgressState();
    return `
      <section class="doke-v2-profile-progress" aria-label="Nivel e pontos">
        <div class="doke-v2-profile-progress-points">
          <span class="eyebrow">Pontos</span>
          <strong>${progress.pointsLabel}</strong>
        </div>
        <div class="doke-v2-profile-progress-trackWrap">
          <div class="doke-v2-profile-progress-head">
            <span class="level">Nivel ${progress.levelLabel}</span>
            <span class="xp">${progress.xpLabel}</span>
          </div>
          <div class="progress-track" aria-hidden="true">
            <span class="progress-fill" style="width:${progress.progressPct}%"></span>
          </div>
        </div>
      </section>
    `;
  }

  function injectProfileProgress(page) {
    if (!(page instanceof HTMLElement)) return false;
    const root = page.querySelector('#dpRoot');
    if (!(root instanceof HTMLElement)) return false;
    const body = root.querySelector('.dp-card .dp-body');
    const info = root.querySelector('.dp-info');
    const actions = root.querySelector('.dp-actions');
    if (!(body instanceof HTMLElement) || !(info instanceof HTMLElement) || !(actions instanceof HTMLElement)) return false;

    const existing = body.querySelector('.doke-v2-profile-progress');
    const shouldShow = hasLocalAuth();
    if (!shouldShow) {
      if (existing instanceof HTMLElement) existing.remove();
      return false;
    }

    if (existing instanceof HTMLElement) {
      existing.outerHTML = buildProfileProgressMarkup();
      return true;
    }

    const wrap = document.createElement('div');
    wrap.innerHTML = buildProfileProgressMarkup();
    const card = wrap.firstElementChild;
    if (!(card instanceof HTMLElement)) return false;
    actions.insertAdjacentElement('afterbegin', card);
    body.classList.add('doke-v2-profile-progress-ready');
    return true;
  }

  function stabilizeProfileShell(page, file, search, cleanup) {
    if (!(page instanceof HTMLElement)) return;
    const rerun = () => {
      try { syncProfileRoute(file, search); } catch (_e) {}
      try { injectProfileProgress(page); } catch (_e) {}
      try { window.dispatchEvent(new Event('resize')); } catch (_e) {}
    };
    rerun();
    [120, 420, 900, 1600].forEach((ms) => {
      const timer = window.setTimeout(rerun, ms);
      cleanup.push(() => {
        try { window.clearTimeout(timer); } catch (_e) {}
      });
    });
  }

  function shouldShowNativeHero(type) {
    return type === "community";
  }

  function syncProfileRoute(file, search) {
    try {
      const desired = `${String(file || '').toLowerCase()}${String(search || '')}`;
      if (!desired) return;
      const currentFile = String((location.pathname || '').split('/').pop() || 'index.html').toLowerCase();
      const current = `${currentFile}${location.search || ''}`;
      if (current !== desired) {
        history.replaceState({ dokeV2: 1, path: desired }, '', desired);
      }
      const shell = window.__DOKE_V2_ACTIVE_SHELL__;
      if (shell && typeof shell.setActive === 'function') shell.setActive(file);
      try { document.body.setAttribute('data-page', 'perfil'); } catch (_e) {}
    } catch (_e) {}
  }

  function pinProfileRoute(file, search) {
    const desiredFile = String(file || '').toLowerCase();
    const desiredSearch = String(search || '');
    const desired = `${desiredFile}${desiredSearch}`;
    if (!desiredFile) return () => {};

    let timer = 0;
    let tries = 0;
    const run = () => {
      tries += 1;
      syncProfileRoute(desiredFile, desiredSearch);
      const currentFile = String((location.pathname || '').split('/').pop() || 'index.html').toLowerCase();
      const isStable = currentFile === desiredFile && String(location.search || '') === desiredSearch;
      if (isStable && tries >= 4) return;
      if (tries >= 18) return;
      timer = window.setTimeout(run, tries < 6 ? 180 : 360);
    };
    run();
    return () => {
      try { window.clearTimeout(timer); } catch (_e) {}
    };
  }

  function authRedirectCard() {
    return `
      <div class="doke-v2-card doke-v2-empty-state" style="padding:28px;display:grid;gap:12px;">
        <h2>Entre para continuar</h2>
        <p>Essa área precisa de login para carregar seus dados e sua atividade.</p>
        <div><a href="login.html" class="v2-orders-card-action v2-orders-card-action--primary" data-v2-native>Entrar</a></div>
      </div>`;
  }

  async function mountSocialPage(ctx) {
    const file = normalizeFile(ctx?.path || '');
    const cfg = ROUTES[file] || {
      title: file.replace(/\.html$/i, ''),
      eyebrow: 'App-v2',
      description: 'Conteúdo legado reaproveitado numa superfície social nativa.',
      highlight: [],
      type: 'generic'
    };

    const requiresAuth = cfg.type === 'profile';
    if (requiresAuth && !hasLocalAuth()) {
      try {
        const next = encodeURIComponent(file + (location.search || '') + (location.hash || ''));
        location.replace(`login.html?next=${next}`);
      } catch (_e) {
        location.replace('login.html');
      }
      return { unmount(){} };
    }

    const page = document.createElement('section');
    const cleanup = [];
    page.className = `doke-v2-page doke-v2-page-social doke-v2-page-social-${cfg.type}`;
    if (cfg.type === 'profile') page.classList.add('is-profile-shell');
    if (cfg.type === 'community') page.classList.add('is-community-shell');
    const showNativeHero = shouldShowNativeHero(cfg.type);
    page.innerHTML = `
      <div class="doke-v2-social-shell">
        <div class="doke-v2-social-top doke-v2-hero" ${showNativeHero ? '' : 'hidden'}>
          <div>
            <span class="doke-v2-eyebrow">${cfg.eyebrow}</span>
            <h1>${cfg.title}</h1>
            <p>${cfg.description}</p>
          </div>
          <div class="doke-v2-social-pills">${metricsHtml(cfg.highlight)}</div>
        </div>
        <div class="doke-v2-social-body">
          <div class="doke-v2-social-loading">
            ${showNativeHero ? '<div class="doke-v2-skeleton-block is-hero"></div>' : ''}
            <div class="doke-v2-skeleton-grid is-social">
              <div class="doke-v2-skeleton-block"></div>
              <div class="doke-v2-skeleton-block"></div>
              <div class="doke-v2-skeleton-block"></div>
            </div>
          </div>
        </div>
      </div>
    `;
    ctx.root.appendChild(page);

    const api = bridge();
    const layout = await (api.getLayout ? api.getLayout(file) : Promise.resolve({ html: '', title: cfg.title, linkedStyles: [], inlineStyles: '', linkedScripts: [], inlineScripts: [] }));
    try { api.ensureInlineStyles && api.ensureInlineStyles(file, layout.inlineStyles); } catch (_e) {}
    try { api.ensureLinkedStyles && api.ensureLinkedStyles(layout.linkedStyles); } catch (_e) {}

    const body = page.querySelector('.doke-v2-social-body');
    if (!(body instanceof HTMLElement)) return { unmount() { page.remove(); } };
    body.innerHTML = '';

    const surface = document.createElement('div');
    surface.className = 'doke-v2-social-surface';

    if (layout.html) {
      const content = document.createElement('div');
      content.className = 'doke-v2-social-content';
      content.innerHTML = layout.html;
      normalizeInjectedContent(content, cfg.type);
      const derivedTitle = firstText(content, ['h1', '.grupo-title', '.comm-title h1', '.dp-name', '.perfil-title']);
      const titleNode = page.querySelector('.doke-v2-social-top h1');
      if (derivedTitle && titleNode) titleNode.textContent = derivedTitle;
      surface.appendChild(content);
      body.appendChild(surface);

      const shouldRunLegacyScripts = ['community','group','feed','profile'].includes(cfg.type);
      if (shouldRunLegacyScripts) {
        try { api.executeLinkedScripts && await api.executeLinkedScripts(layout.linkedScripts, file); } catch (_e) {}
        try { api.executeInlineScripts && await api.executeInlineScripts(layout.inlineScripts, file); } catch (_e) {}
        try { document.dispatchEvent(new Event('DOMContentLoaded')); } catch (_e) {}
        try { window.dispatchEvent(new Event('load')); } catch (_e) {}
      }
    } else {
      surface.innerHTML = `
        <div class="doke-v2-card doke-v2-empty-state">
          <h2>${cfg.title}</h2>
          <p>Essa rota já saiu do fluxo legacy-html, mas ainda precisa de mais portabilidade funcional.</p>
        </div>
      `;
      body.appendChild(surface);
    }

    try { document.body.setAttribute('data-page', cfg.type); } catch (_e) {}
    if (cfg.type === 'profile') {
      syncProfileRoute(file, ctx?.search || '');
      try {
        window.setTimeout(() => syncProfileRoute(file, ctx?.search || ''), 120);
        window.setTimeout(() => syncProfileRoute(file, ctx?.search || ''), 600);
        cleanup.push(pinProfileRoute(file, ctx?.search || ''));
      } catch (_e) {}
      stabilizeProfileShell(page, file, ctx?.search || '', cleanup);
    }
    try { window.dispatchEvent(new Event('resize')); } catch (_e) {}

    return {
      unmount() {
        cleanup.forEach((fn) => {
          try { if (typeof fn === 'function') fn(); } catch (_e) {}
        });
        try { page.remove(); } catch (_e) {}
      }
    };
  }

  window[key] = {
    mountCommunity: mountSocialPage,
    mountGroup: mountSocialPage,
    mountOwnProfile: mountSocialPage,
    mountProfessionalProfile: mountSocialPage,
    mountGenericProfile: mountSocialPage,
    mountCompanyProfile: mountSocialPage,
    mountFeed: mountSocialPage,
    mountPublications: mountSocialPage,
    mountInteractions: mountSocialPage,
    mountSocialPage
  };
})();
