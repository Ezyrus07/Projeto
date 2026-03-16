(() => {
  const key = "__DOKE_V2_PAGE_CAMPAIGNS__";
  if (window[key]) return;

  const bridge = () => window.__DOKE_V2_PAGE_NATIVE_BRIDGE__ || {};

  const ROUTES = {
    "anunciar.html": {
      type: "announce",
      eyebrow: "Aquisição e anúncios",
      title: "Criar anúncio em uma superfície nativa do app-v2",
      description: "Fluxo de criação colocado numa camada mais estável do v2, com shell fixa, hero uniforme e reaproveitamento do conteúdo central legado.",
      pills: ["Objetivo", "Criativo", "Publicação"],
      accent: "announce"
    },
    "anunciar-negocio.html": {
      type: "announce-business",
      eyebrow: "Aquisição e anúncios",
      title: "Anúncio de negócio com contexto nativo e leitura mais clara",
      description: "A página sai da bridge genérica e passa a usar uma superfície própria, preparada para ajustes posteriores de formulário e regras de negócio.",
      pills: ["Negócio", "Oferta", "Segmentação"],
      accent: "announce-business"
    },
    "editar-anuncio.html": {
      type: "edit-ad",
      eyebrow: "Aquisição e anúncios",
      title: "Editar anúncio dentro da shell nativa do app-v2",
      description: "O formulário legado continua reaproveitado, mas agora entra em uma camada mais coerente com o restante do produto.",
      pills: ["Editar", "Mídia", "Salvar"],
      accent: "edit-ad"
    },
    "avaliar.html": {
      type: "review",
      eyebrow: "Confiança e reputação",
      title: "Avaliação reaproveitada em uma superfície nativa",
      description: "A experiência de avaliação ganha hero uniforme, loading estável e contexto visual mais consistente no app-v2.",
      pills: ["Nota", "Comentário", "Confirmação"],
      accent: "review"
    },
    "quiz.html": {
      type: "quiz",
      eyebrow: "Diagnóstico e descoberta",
      title: "Quiz com shell nativa e transição mais estável",
      description: "O conteúdo do quiz continua vindo do HTML legado, mas agora dentro de uma camada preparada para melhorias iterativas.",
      pills: ["Perguntas", "Progresso", "Resultado"],
      accent: "quiz"
    },
    "diagnostico.html": {
      type: "diagnosis",
      eyebrow: "Diagnóstico e descoberta",
      title: "Diagnóstico com hero uniforme e leitura mais limpa",
      description: "Essa rota deixa a bridge genérica e passa a uma superfície dedicada do app-v2, pronta para refinamento funcional.",
      pills: ["Leitura", "Sinais", "Ações"],
      accent: "diagnosis"
    },
    "diagnostico-avancado.html": {
      type: "diagnosis-advanced",
      eyebrow: "Diagnóstico e descoberta",
      title: "Diagnóstico avançado numa camada nativa do app-v2",
      description: "A página mais densa do fluxo de diagnóstico ganha shell fixa, skeleton estável e contexto visual consistente.",
      pills: ["Análise", "Detalhes", "Próximos passos"],
      accent: "diagnosis-advanced"
    },
    "tornar-profissional.html": {
      type: "upgrade-pro",
      eyebrow: "Conta profissional",
      title: "Valide sua conta dentro da shell nativa do app-v2",
      description: "O fluxo para se tornar profissional fica alinhado ao CTA de anunciar, sem voltar para a camada legada completa durante a navegacao.",
      pills: ["Conta", "Validacao", "Anuncios"],
      accent: "upgrade-pro"
    }
  };

  function normalizeFile(path) {
    return (bridge().normalizeFile ? bridge().normalizeFile(path) : String(path || '').toLowerCase().split('/').pop() || 'index.html');
  }

  function pillsHtml(pills) {
    return (pills || []).map((item) => `<span class="doke-v2-campaign-pill">${item}</span>`).join('');
  }

  function statsHtml(cfg) {
    return `
      <div class="doke-v2-hero-stats doke-v2-campaign-stats">
        <article><small>Camada</small><strong>app-v2</strong></article>
        <article><small>Estratégia</small><strong>Bridge nativa</strong></article>
        <article><small>Estado</small><strong>Em evolução</strong></article>
      </div>`;
  }

  function normalizeInjectedContent(content, cfg) {
    if (!(content instanceof HTMLElement)) return;
    content.classList.add('doke-v2-campaign-content', `is-${cfg.type}`);
    content.querySelectorAll('main, .dp-wrap, .container-principal, .container, .main-content').forEach((node) => {
      if (node instanceof HTMLElement) node.classList.add('doke-v2-campaign-main');
    });
    content.querySelectorAll('.hero, .hero-section, .page-hero, .hero-negocios, .topo-pagina, .diagnostico-hero, .quiz-hero').forEach((node) => {
      if (node instanceof HTMLElement) node.classList.add('doke-v2-hero');
    });
    content.querySelectorAll('.card, .stat-card, .analytics-card, .quiz-card, .resultado-card, .form-card, .etapa-card').forEach((node) => {
      if (node instanceof HTMLElement) node.classList.add('doke-v2-campaign-card');
    });
    const firstForm = content.querySelector('form');
    if (firstForm instanceof HTMLElement) firstForm.classList.add('doke-v2-campaign-form');
  }

  async function mountCampaignPage(ctx) {
    const file = normalizeFile(ctx?.path || '');
    const cfg = ROUTES[file] || {
      type: 'campaign',
      eyebrow: 'Camada nativa',
      title: file.replace(/\.html$/i, ''),
      description: 'Conteúdo legado reaproveitado numa superfície nativa do app-v2.',
      pills: ['Fluxo', 'Estado', 'Conteúdo'],
      accent: 'generic'
    };

    const page = document.createElement('section');
    page.className = `doke-v2-page doke-v2-page-campaign doke-v2-page-${cfg.type}`;
    page.innerHTML = `
      <div class="doke-v2-campaign-shell">
        <section class="doke-v2-hero doke-v2-page-hero doke-v2-campaign-hero is-${cfg.accent}">
          <div class="doke-v2-campaign-copy">
            <h1>${cfg.title}</h1>
            <p>${cfg.description}</p>
          </div>
        </section>
        <section class="doke-v2-section-card doke-v2-campaign-wrap">
          <div class="doke-v2-campaign-loading" aria-hidden="true">
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

    const wrap = page.querySelector('.doke-v2-campaign-wrap');
    if (!(wrap instanceof HTMLElement)) return { unmount() { page.remove(); } };
    wrap.innerHTML = '';

    const surface = document.createElement('div');
    surface.className = 'doke-v2-campaign-surface';

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
          <p>Essa rota já saiu da bridge genérica e agora tem uma superfície própria no app-v2, mas ainda precisa de portabilidade funcional mais profunda.</p>
        </div>`;
      wrap.appendChild(surface);
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
    mountCreateAd: mountCampaignPage,
    mountCreateBusinessAd: mountCampaignPage,
    mountEditAd: mountCampaignPage,
    mountReview: mountCampaignPage,
    mountQuiz: mountCampaignPage,
    mountDiagnosis: mountCampaignPage,
    mountAdvancedDiagnosis: mountCampaignPage,
    mountBecomeProfessional: mountCampaignPage,
    mountCampaignPage
  };
})();
