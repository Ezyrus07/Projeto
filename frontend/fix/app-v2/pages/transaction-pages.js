(() => {
  const key = "__DOKE_V2_PAGE_TRANSACTIONAL__";
  if (window[key]) return;

  const bridgeApi = () => window.__DOKE_V2_PAGE_NATIVE_BRIDGE__;

  const CONFIG = {
    "orcamento.html": {
      type: "orcamento",
      eyebrow: "Fluxo transacional",
      title: "Orçamentos em uma superfície mais estável do app-v2",
      description: "O conteúdo legado do orçamento entra dentro da shell nativa com hero uniforme, skeleton reservado e contexto mais claro para continuar a correção fina depois.",
      pills: ["Resumo", "Pedido", "Proposta"],
      accent: "proposal"
    },
    "pagar.html": {
      type: "pagar",
      eyebrow: "Fluxo transacional",
      title: "Pagamento com shell nativa e leitura visual mais limpa",
      description: "A página de pagamento saiu da bridge genérica e agora entra numa superfície própria do v2, preservando o conteúdo central legado dentro de um contexto mais coerente.",
      pills: ["Cobrança", "Carteira", "Confirmação"],
      accent: "payment"
    },
    "pedido.html": {
      type: "pedido",
      eyebrow: "Fluxo transacional",
      title: "Pedido centralizado na shell nativa do app-v2",
      description: "A experiência de pedido fica mais consistente com mensagens, notificações e pedidos, sem voltar para a shell antiga durante a navegação.",
      pills: ["Status", "Chat", "Detalhes"],
      accent: "orders"
    },
    "projeto.html": {
      type: "projeto",
      eyebrow: "Fluxo transacional",
      title: "Projeto reaproveitado numa camada nativa preparada para refinamento",
      description: "O conteúdo do projeto continua reaproveitado, mas agora com hero, loading e superfície alinhados ao resto do app-v2.",
      pills: ["Projeto", "Etapas", "Entrega"],
      accent: "project"
    },
    "resultado.html": {
      type: "resultado",
      eyebrow: "Fluxo transacional",
      title: "Resultado com contexto nativo e menos ruptura visual",
      description: "Essa rota deixa de aparecer como conteúdo legado solto e passa a entrar numa camada nativa do app-v2, já pronta para ajustes funcionais posteriores.",
      pills: ["Resumo", "Diagnóstico", "Próximos passos"],
      accent: "result"
    }
  };

  function metricLabel(type) {
    if (type === 'pagar') return 'Confirmação';
    if (type === 'pedido') return 'Atendimento';
    if (type === 'projeto') return 'Estrutura';
    if (type === 'resultado') return 'Leitura';
    return 'Fluxo';
  }

  function buildHead(cfg) {
    const pills = (cfg.pills || []).map((label) => `<span>${label}</span>`).join('');
    return `
      <section class="doke-v2-hero doke-v2-page-hero doke-v2-transaction-hero is-${cfg.accent || 'generic'}">
        <div class="doke-v2-transaction-copy">
          <span class="doke-v2-hero-kicker">${cfg.eyebrow || 'Fluxo nativo'}</span>
          <h1>${cfg.title}</h1>
          <p>${cfg.description}</p>
          <div class="doke-v2-transaction-pills">${pills}</div>
        </div>
        <div class="doke-v2-hero-stats doke-v2-transaction-stats">
          <article><small>Camada</small><strong>app-v2</strong></article>
          <article><small>Estratégia</small><strong>Reaproveitamento</strong></article>
          <article><small>${metricLabel(cfg.type)}</small><strong>Em evolução</strong></article>
        </div>
      </section>`;
  }

  function normalizeSurface(page, cfg) {
    page.classList.add('doke-v2-page-transactional', `doke-v2-page-${cfg.type}`);
    const legacy = page.querySelector('.doke-v2-bridge-content, .doke-v2-social-content');
    if (legacy instanceof HTMLElement) {
      legacy.classList.add('doke-v2-transaction-body');
      const firstCardish = legacy.querySelector('.container, .container-principal, .orcamento-container, .pedido-container, .projeto-container, .resultado-container, .checkout-container, .main-content');
      if (firstCardish instanceof HTMLElement) firstCardish.classList.add('doke-v2-transaction-root');
    }
  }

  async function mountTransactionalPage(ctx) {
    const bridge = bridgeApi();
    const file = bridge?.normalizeFile ? bridge.normalizeFile(ctx?.path || '') : String(ctx?.path || '').toLowerCase().split('/').pop();
    const cfg = CONFIG[file] || {
      type: 'fluxo',
      title: 'Fluxo transacional no app-v2',
      description: 'Conteúdo legado reaproveitado numa camada nativa preparada para refinamento posterior.',
      pills: ['Fluxo', 'Estado', 'Detalhes'],
      accent: 'generic'
    };

    const page = document.createElement('section');
    page.className = `doke-v2-page doke-v2-page-transactional-shell doke-v2-page-${cfg.type}`;
    page.innerHTML = `
      ${buildHead(cfg)}
      <section class="doke-v2-section-card doke-v2-transaction-wrap">
        <div class="doke-v2-transaction-skeleton" aria-hidden="true">
          <div class="doke-v2-skeleton-line is-title"></div>
          <div class="doke-v2-skeleton-grid cols-2">
            <div class="doke-v2-skeleton-block"></div>
            <div class="doke-v2-skeleton-block"></div>
          </div>
          <div class="doke-v2-skeleton-block is-tall"></div>
        </div>
      </section>`;
    ctx.root.appendChild(page);

    let child = null;
    if (bridge?.mountNativeBridge) {
      const mountCtx = {
        ...ctx,
        root: page.querySelector('.doke-v2-transaction-wrap') || page,
        path: file
      };
      child = await bridge.mountNativeBridge(mountCtx);
    }

    normalizeSurface(page, cfg);
    try { document.body.setAttribute('data-page', cfg.type); } catch (_e) {}
    try { window.dispatchEvent(new Event('resize')); } catch (_e) {}

    return {
      unmount() {
        try { child?.unmount?.(); } catch (_e) {}
        try { page.remove(); } catch (_e) {}
      }
    };
  }

  window[key] = {
    mountBudget: mountTransactionalPage,
    mountPay: mountTransactionalPage,
    mountOrderDetail: mountTransactionalPage,
    mountProject: mountTransactionalPage,
    mountResult: mountTransactionalPage,
    mountTransactionalPage
  };
})();
