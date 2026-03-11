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
      return hasFlag || hasIdentity;
    } catch (_e) {
      return false;
    }
  }

  function shouldShowNativeHero(type) {
    return false;
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

    const page = document.createElement('section');
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

      const shouldRunLegacyScripts = ['community','group','feed'].includes(cfg.type);
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
    try { window.dispatchEvent(new Event('resize')); } catch (_e) {}

    return {
      unmount() {
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
