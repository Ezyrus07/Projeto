(() => {
  const key = "__DOKE_V2_PAGE_UTILITY__";
  if (window[key]) return;

  const bridge = () => window.__DOKE_V2_PAGE_NATIVE_BRIDGE__ || {};

  const ROUTES = {
    "login.html": {
      type: "auth",
      variant: "login",
      eyebrow: "Acesso",
      title: "Entrar na sua conta",
      description: "Use seu e-mail e senha para continuar.",
      pills: []
    },
    "cadastro.html": {
      type: "auth",
      variant: "signup",
      eyebrow: "Onboarding",
      title: "Criar conta",
      description: "Cadastre seus dados para começar a usar a Doke.",
      pills: []
    },
    "explorar.html": {
      type: "discover",
      variant: "explore",
      eyebrow: "Descoberta",
      title: "Explorar com contexto nativo e leitura mais limpa",
      description: "A superfície de descoberta ganha hero uniforme, skeleton estável e reaproveitamento do conteúdo legado dentro da shell real do app-v2.",
      pills: ["Explorar", "Sugestões", "Tendências"]
    },
    "estatistica.html": {
      type: "analytics",
      variant: "stats",
      eyebrow: "Métricas",
      title: "Estatísticas em uma camada analítica mais coerente",
      description: "A rota de estatísticas passa a uma superfície própria do v2, com cards, loading e contexto visual consistentes.",
      pills: ["Métricas", "Leitura", "Desempenho"]
    },
    "admin-validacoes.html": {
      type: "admin",
      variant: "validation",
      eyebrow: "Operação",
      title: "Validações administrativas dentro da shell nativa",
      description: "A área administrativa sai da bridge genérica e passa para uma superfície de operação do app-v2, pronta para correções finas posteriores.",
      pills: ["Fila", "Revisão", "Aprovação"]
    }
  };

  function normalizeFile(path) {
    return (bridge().normalizeFile ? bridge().normalizeFile(path) : String(path || '').toLowerCase().split('/').pop() || 'index.html');
  }

  function pillsHtml(items) {
    return (items || []).map((item) => `<span class="doke-v2-utility-pill">${item}</span>`).join('');
  }

  function statsHtml(cfg) {
    const label = cfg.type === 'auth' ? 'Sessão' : cfg.type === 'admin' ? 'Fluxo' : cfg.type === 'analytics' ? 'Painel' : 'Leitura';
    return `
      <div class="doke-v2-hero-stats doke-v2-utility-stats">
        <article><small>Camada</small><strong>app-v2</strong></article>
        <article><small>Estratégia</small><strong>Superfície dedicada</strong></article>
        <article><small>${label}</small><strong>Em evolução</strong></article>
      </div>`;
  }

  function normalizeInjectedContent(content, cfg) {
    if (!(content instanceof HTMLElement)) return;
    content.classList.add('doke-v2-utility-content', `is-${cfg.variant}`);
    content.querySelectorAll('main, .dp-wrap, .container-principal, .container, .main-content, .auth-container, .login-container').forEach((node) => {
      if (node instanceof HTMLElement) node.classList.add('doke-v2-utility-main');
    });
    content.querySelectorAll('.hero, .hero-section, .page-hero, .topo-pagina, .stats-hero, .admin-hero, .login-hero, .cadastro-hero').forEach((node) => {
      if (node instanceof HTMLElement) node.classList.add('doke-v2-hero');
    });
    content.querySelectorAll('.card, .stat-card, .analytics-card, .metric-card, .painel-card, .queue-card, .post-card, .user-card').forEach((node) => {
      if (node instanceof HTMLElement) node.classList.add('doke-v2-utility-card');
    });
    if (cfg.type === 'auth') {
      const firstForm = content.querySelector('form');
      if (firstForm instanceof HTMLElement) firstForm.classList.add('doke-v2-utility-form');
      const firstCard = content.querySelector('.card, .login-card, .cadastro-card, form');
      if (firstCard instanceof HTMLElement) firstCard.classList.add('doke-v2-auth-card');
    }
  }

  async function mountUtilityPage(ctx) {
    const file = normalizeFile(ctx?.path || '');
    const cfg = ROUTES[file] || {
      type: 'utility',
      variant: 'generic',
      eyebrow: 'Camada nativa',
      title: file.replace(/\.html$/i, ''),
      description: 'Conteúdo legado reaproveitado dentro de uma superfície dedicada do app-v2.',
      pills: ['Estado', 'Conteúdo', 'Fluxo']
    };

    const page = document.createElement('section');
    page.className = `doke-v2-page doke-v2-page-utility doke-v2-page-${cfg.variant}`;
    page.innerHTML = `
      <div class="doke-v2-utility-shell type-${cfg.type}">
        <section class="doke-v2-hero doke-v2-page-hero doke-v2-utility-hero is-${cfg.variant}">
          <div class="doke-v2-utility-copy">
            <span class="doke-v2-hero-kicker">${cfg.eyebrow}</span>
            <h1>${cfg.title}</h1>
            <p>${cfg.description}</p>
            <div class="doke-v2-utility-pills">${pillsHtml(cfg.pills)}</div>
          </div>
          ${statsHtml(cfg)}
        </section>
        <section class="doke-v2-section-card doke-v2-utility-wrap">
          <div class="doke-v2-utility-loading" aria-hidden="true">
            <div class="doke-v2-skeleton-line is-title"></div>
            <div class="doke-v2-skeleton-block is-hero"></div>
            <div class="doke-v2-skeleton-grid cols-2">
              <div class="doke-v2-skeleton-block"></div>
              <div class="doke-v2-skeleton-block"></div>
            </div>
            <div class="doke-v2-skeleton-block is-tall"></div>
          </div>
        </section>
      </div>`;
    ctx.root.appendChild(page);

    const api = bridge();
    const layout = await (api.getLayout ? api.getLayout(file) : Promise.resolve({ html: '', linkedStyles: [], inlineStyles: '', linkedScripts: [], inlineScripts: [] }));
    try { api.ensureInlineStyles && api.ensureInlineStyles(file, layout.inlineStyles); } catch (_e) {}
    try { api.ensureLinkedStyles && api.ensureLinkedStyles(layout.linkedStyles); } catch (_e) {}

    const wrap = page.querySelector('.doke-v2-utility-wrap');
    if (!(wrap instanceof HTMLElement)) return { unmount() { page.remove(); } };
    wrap.innerHTML = '';

    const surface = document.createElement('div');
    surface.className = 'doke-v2-utility-surface';

    if (layout.html) {
      const content = document.createElement('div');
      content.innerHTML = layout.html;
      normalizeInjectedContent(content, cfg);
      surface.appendChild(content);
      wrap.appendChild(surface);
      try { api.executeLinkedScripts && await api.executeLinkedScripts(layout.linkedScripts, file); } catch (_e) {}
      try { api.executeInlineScripts && await api.executeInlineScripts(layout.inlineScripts, file); } catch (_e) {}
    } else {
      surface.innerHTML = `
        <div class="doke-v2-card doke-v2-empty-state">
          <h2>${cfg.title}</h2>
          <p>Essa rota já saiu da bridge genérica, mas ainda precisa de portabilidade funcional mais profunda.</p>
        </div>`;
      wrap.appendChild(surface);
    }

    try { document.body.setAttribute('data-page', cfg.variant); } catch (_e) {}
    try { window.dispatchEvent(new Event('resize')); } catch (_e) {}

    return {
      unmount() {
        try { page.remove(); } catch (_e) {}
      }
    };
  }

  window[key] = {
    mountLogin: mountUtilityPage,
    mountSignup: mountUtilityPage,
    mountExplore: mountUtilityPage,
    mountStats: mountUtilityPage,
    mountAdminValidation: mountUtilityPage,
    mountUtilityPage
  };
})();
