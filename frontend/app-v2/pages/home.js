(() => {
  const key = "__DOKE_V2_PAGE_HOME__";
  if (window[key]) return;

  function safeInvoke(fn){
    if (typeof fn !== "function") return;
    try {
      const out = fn();
      if (out && typeof out.then === "function") out.catch(() => {});
    } catch (_e) {}
  }

  function fixMojibake(text) {
    const value = String(text || "");
    try {
      return decodeURIComponent(escape(value));
    } catch (_e) {
      return value;
    }
  }

  function bindHomeSearch(page, on) {
    if (!(page instanceof Element)) return;
    const wrapper = page.querySelector("#buscaWrapper");
    const inputBusca = page.querySelector("#inputBusca");
    const limparBtn = page.querySelector("#limparHistoricoBtn");
    const btnLupa = page.querySelector(".btn-search-circle");
    const btnProcurarMain = page.querySelector(".btn-procurar");
    if (!(inputBusca instanceof HTMLInputElement)) return;

    safeInvoke(() => window.atualizarListaHistorico && window.atualizarListaHistorico());

    const executarBusca = () => {
      const termo = String(inputBusca.value || "").trim();
      if (!termo) return;
      safeInvoke(() => window.salvarBusca && window.salvarBusca(termo));
      const target = `busca.html?q=${encodeURIComponent(termo)}`;
      if (typeof window.__DOKE_V2_NAVIGATE__ === "function") {
        safeInvoke(() => window.__DOKE_V2_NAVIGATE__(target));
        return;
      }
      location.href = `busca.html?appv2=1&q=${encodeURIComponent(termo)}`;
    };

    on(inputBusca, "focus", () => {
      if (wrapper) wrapper.classList.add("active");
    });
    on(document, "click", (e) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (wrapper && !wrapper.contains(t)) wrapper.classList.remove("active");
    });
    on(inputBusca, "keypress", (e) => {
      if (e.key === "Enter") executarBusca();
    });
    on(btnLupa, "click", (e) => {
      e.preventDefault();
      executarBusca();
    });
    on(btnProcurarMain, "click", (e) => {
      e.preventDefault();
      executarBusca();
    });
    on(limparBtn, "click", (e) => {
      e.preventDefault();
      safeInvoke(() => window.limparHistorico && window.limparHistorico(e));
    });
  }

  function startTypewriterEffect(page, onTeardown) {
    if (!(page instanceof Element)) return;
    const el = page.querySelector("#typewriter");
    if (!(el instanceof HTMLElement)) return;
    if (el.dataset.v2TypewriterBound === "1") return;
    el.dataset.v2TypewriterBound = "1";

    const kind = String(document.body?.dataset?.kind || "").toLowerCase();
    const frases = kind === "negocios"
      ? [
          "Restaurantes proximos",
          "Mercados abertos agora",
          "Cafes e padarias",
          "Farmacias 24h",
          "Lojas na sua regiao",
          "Delivery na sua rua"
        ]
      : [
          "Chefs de cozinha proximos",
          "Eletricistas na pituba",
          "Aulas de ingles online",
          "Manutencao de ar-condicionado",
          "Personal trainers",
          "Advogados"
        ];
    if (!frases.length) return;

    let stopped = false;
    let timer = null;
    let fraseIndex = 0;
    let charIndex = 0;
    let isDeleting = false;

    const tick = () => {
      if (stopped || !el.isConnected) return;
      const currentPhrase = frases[fraseIndex];
      if (isDeleting) {
        el.textContent = currentPhrase.substring(0, Math.max(0, charIndex - 1));
        charIndex = Math.max(0, charIndex - 1);
      } else {
        el.textContent = currentPhrase.substring(0, charIndex + 1);
        charIndex = Math.min(currentPhrase.length, charIndex + 1);
      }

      let delay = isDeleting ? 50 : 95;
      if (!isDeleting && charIndex >= currentPhrase.length) {
        delay = 1700;
        isDeleting = true;
      } else if (isDeleting && charIndex <= 0) {
        isDeleting = false;
        fraseIndex = (fraseIndex + 1) % frases.length;
        delay = 400;
      }
      timer = window.setTimeout(tick, delay);
    };

    tick();
    if (typeof onTeardown === "function") {
      onTeardown(() => {
        stopped = true;
        if (timer) {
          try { window.clearTimeout(timer); } catch (_e) {}
        }
      });
    }
  }

  function hydrateHome(page) {
    if (!(page instanceof Element)) return;
    const params = new URLSearchParams(location.search || "");
    const termoUrl = String(params.get("q") || "").trim();
    const inputBusca = page.querySelector("#inputBusca");
    if (inputBusca instanceof HTMLInputElement && termoUrl) {
      inputBusca.value = termoUrl;
    }

    const jobs = [
      { sel: "#listaCategorias", run: () => window.carregarCategorias && window.carregarCategorias() },
      { sel: "#galeria-dinamica", run: () => window.carregarReelsHome && window.carregarReelsHome() },
      { sel: "#feed-global-container", run: () => window.carregarFeedGlobal && window.carregarFeedGlobal() },
      { sel: "#boxStories", run: () => window.carregarStoriesGlobal && window.carregarStoriesGlobal() },
      { sel: "#prosDestaque, #prosNovos", run: () => window.carregarProfissionaisIndex && window.carregarProfissionaisIndex() },
      { sel: "#selectEstado", run: () => window.carregarFiltrosLocalizacao && window.carregarFiltrosLocalizacao() },
      { sel: "#feedAnuncios", run: () => window.carregarAnunciosDoFirebase && window.carregarAnunciosDoFirebase(termoUrl || "") }
    ];
    const runJobs = () => {
      jobs.forEach((job) => {
        if (page.querySelector(job.sel)) safeInvoke(job.run);
      });
    };
    runJobs();
    try { window.setTimeout(runJobs, 450); } catch (_e) {}
    try { window.setTimeout(runJobs, 1300); } catch (_e) {}
    safeInvoke(() => window.initHomeEnhancements && window.initHomeEnhancements());
  }

  function buildHomeFromLegacyHtml() {
    const legacy = window.__DOKE_V2_LEGACY__ || {};
    const htmlMain = fixMojibake(String(legacy.homeMainHtml || "")).trim();
    const htmlFooter = fixMojibake(String(legacy.homeFooterHtml || "")).trim();
    if (!htmlMain) return null;

    const tplMain = document.createElement("template");
    tplMain.innerHTML = htmlMain;
    const main = tplMain.content.querySelector("main.dp-wrap") || tplMain.content.querySelector("main");
    if (!(main instanceof HTMLElement)) return null;

    let footer = null;
    if (htmlFooter) {
      const tplFooter = document.createElement("template");
      tplFooter.innerHTML = htmlFooter;
      const node = tplFooter.content.querySelector("footer.main-footer") || tplFooter.content.querySelector("footer");
      if (node instanceof HTMLElement) footer = node;
    }
    return { main, footer };
  }

  function mountHome(ctx) {
    const page = document.createElement("section");
    page.className = "doke-v2-page doke-v2-page-home";
    const teardown = [];
    const on = (target, type, handler, options) => {
      if (!target || typeof target.addEventListener !== "function" || !type || typeof handler !== "function") return;
      target.addEventListener(type, handler, options);
      teardown.push(() => {
        try { target.removeEventListener(type, handler, options); } catch (_e) {}
      });
    };

    const layout = buildHomeFromLegacyHtml();
    if (layout && layout.main) {
      page.appendChild(layout.main);
      if (layout.footer) page.appendChild(layout.footer);
      ctx.root.appendChild(page);

      bindHomeSearch(page, on);
      startTypewriterEffect(page, (fn) => teardown.push(fn));

      // Roda hidratação após inserir no DOM para os loaders encontrarem os elementos.
      try {
        window.requestAnimationFrame(() => {
          hydrateHome(page);
          try { window.dispatchEvent(new Event("doke:page-ready")); } catch (_e) {}
        });
      } catch (_e) {
        hydrateHome(page);
        try { window.dispatchEvent(new Event("doke:page-ready")); } catch (_e2) {}
      }
    } else {
      page.innerHTML = `
        <div class="doke-v2-card">
          <h1>Home v2 (migracao)</h1>
          <p>Conteudo legado nao encontrado para portar automaticamente.</p>
        </div>
      `;
      ctx.root.appendChild(page);
    }
    return {
      unmount() {
        try {
          teardown.splice(0).forEach((fn) => {
            try { fn(); } catch (_e) {}
          });
          page.remove();
        } catch (_e) {}
      }
    };
  }

  window[key] = { mountHome };
})();
