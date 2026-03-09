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
    const dropdownBusca = page.querySelector("#buscaDropdown");
    const limparBtn = page.querySelector("#limparHistoricoBtn");
    const btnLupa = page.querySelector(".btn-search-circle");
    const btnProcurarMain = page.querySelector(".btn-procurar");
    if (!(inputBusca instanceof HTMLInputElement)) return;

    safeInvoke(() => window.atualizarListaHistorico && window.atualizarListaHistorico());

    const dropdownParent = dropdownBusca ? dropdownBusca.parentNode : null;
    const dropdownNext = dropdownBusca ? dropdownBusca.nextSibling : null;
    let dropdownPortaled = false;
    let dropdownRaf = 0;

    const mountDropdownToBody = () => {
      if (!(dropdownBusca instanceof HTMLElement) || dropdownPortaled) return;
      try {
        document.body.appendChild(dropdownBusca);
        dropdownPortaled = true;
      } catch (_e) {}
    };

    const restoreDropdown = () => {
      if (!(dropdownBusca instanceof HTMLElement) || !dropdownPortaled || !dropdownParent) return;
      try {
        if (dropdownNext && dropdownNext.parentNode === dropdownParent) dropdownParent.insertBefore(dropdownBusca, dropdownNext);
        else dropdownParent.appendChild(dropdownBusca);
        dropdownPortaled = false;
      } catch (_e) {}
    };

    const positionDropdown = () => {
      if (!(wrapper instanceof HTMLElement) || !(dropdownBusca instanceof HTMLElement)) return;
      if (!wrapper.classList.contains("active")) return;
      const rect = wrapper.getBoundingClientRect();
      const vw = document.documentElement.clientWidth || window.innerWidth || 0;
      const gutter = 12;
      const width = Math.max(220, Math.round(rect.width));
      const left = Math.max(gutter, Math.min(Math.round(rect.left), vw - width - gutter));
      const top = Math.round(rect.bottom + 10);
      const maxH = Math.max(180, Math.min(420, Math.round((window.innerHeight || 0) - top - gutter)));

      dropdownBusca.classList.add("is-floating");
      dropdownBusca.style.setProperty("position", "fixed", "important");
      dropdownBusca.style.setProperty("left", `${left}px`, "important");
      dropdownBusca.style.setProperty("top", `${top}px`, "important");
      dropdownBusca.style.setProperty("right", "auto", "important");
      dropdownBusca.style.setProperty("width", `${width}px`, "important");
      dropdownBusca.style.setProperty("max-height", `${maxH}px`, "important");
      dropdownBusca.style.setProperty("overflow", "auto", "important");
      dropdownBusca.style.setProperty("z-index", "2147483647", "important");
      dropdownBusca.style.setProperty("display", "block", "important");
    };

    const scheduleDropdownPosition = () => {
      if (!(wrapper instanceof HTMLElement) || !wrapper.classList.contains("active")) return;
      if (dropdownRaf) cancelAnimationFrame(dropdownRaf);
      dropdownRaf = requestAnimationFrame(() => {
        dropdownRaf = 0;
        positionDropdown();
      });
    };

    const openDropdown = () => {
      if (wrapper) wrapper.classList.add("active");
      mountDropdownToBody();
      scheduleDropdownPosition();
    };

    const closeDropdown = () => {
      if (dropdownRaf) {
        cancelAnimationFrame(dropdownRaf);
        dropdownRaf = 0;
      }
      if (wrapper) wrapper.classList.remove("active");
      if (dropdownBusca instanceof HTMLElement) {
        dropdownBusca.classList.remove("is-floating");
        dropdownBusca.style.removeProperty("position");
        dropdownBusca.style.removeProperty("left");
        dropdownBusca.style.removeProperty("top");
        dropdownBusca.style.removeProperty("right");
        dropdownBusca.style.removeProperty("width");
        dropdownBusca.style.removeProperty("max-height");
        dropdownBusca.style.removeProperty("overflow");
        dropdownBusca.style.removeProperty("z-index");
        dropdownBusca.style.removeProperty("display");
      }
      restoreDropdown();
    };

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

    on(inputBusca, "focus", openDropdown);
    on(inputBusca, "input", scheduleDropdownPosition);
    on(window, "resize", scheduleDropdownPosition, { passive: true });
    on(window, "scroll", scheduleDropdownPosition, { passive: true });
    on(document, "keydown", (e) => {
      if (e.key === "Escape") closeDropdown();
    });
    on(document, "click", (e) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      const insideWrapper = !!(wrapper && wrapper.contains(t));
      const insideDropdown = !!(dropdownBusca && dropdownBusca.contains(t));
      if (!insideWrapper && !insideDropdown) closeDropdown();
    });
    on(inputBusca, "keydown", (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      executarBusca();
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

  function normalizeHomeVideoLane(page) {
    if (!(page instanceof Element)) return;
    const track = page.querySelector("#galeria-dinamica");
    if (!(track instanceof HTMLElement)) return;
    const apply = () => {
      track.style.setProperty("display", "flex", "important");
      track.style.setProperty("flex-wrap", "nowrap", "important");
      track.style.setProperty("align-items", "stretch", "important");
      track.style.setProperty("overflow-x", "auto", "important");
      track.style.setProperty("overflow-y", "visible", "important");
      track.style.setProperty("gap", "12px", "important");
      track.style.setProperty("padding-bottom", "14px", "important");
      const cards = track.querySelectorAll(".tiktok-card, .dp-reelCard");
      cards.forEach((card) => {
        if (!(card instanceof HTMLElement)) return;
        card.style.setProperty("position", "relative", "important");
        card.style.setProperty("inset", "auto", "important");
        card.style.setProperty("float", "none", "important");
        card.style.setProperty("flex", "0 0 210px", "important");
        card.style.setProperty("width", "210px", "important");
        card.style.setProperty("min-width", "210px", "important");
        card.style.setProperty("max-width", "210px", "important");
        card.style.setProperty("height", "360px", "important");
        card.style.setProperty("margin", "0", "important");
        card.style.setProperty("left", "auto", "important");
        card.style.setProperty("transform", "none", "important");
      });
      const wrap = page.querySelector(".videos-container");
      if (wrap instanceof HTMLElement) wrap.style.setProperty("overflow", "visible", "important");
    };
    apply();
    try {
      if ("MutationObserver" in window) {
        const mo = new MutationObserver(() => apply());
        mo.observe(track, { childList: true, subtree: true });
      }
    } catch (_e) {}
    try { window.setTimeout(apply, 120); } catch (_e) {}
    try { window.setTimeout(apply, 650); } catch (_e) {}
  }

  function bindHomeCategories(page, on) {
    if (!(page instanceof Element)) return;

    const extractCategoryName = (el) => {
      if (!(el instanceof Element)) return "";
      const fromData = String(el.getAttribute("data-cat") || "").trim();
      if (fromData) return fromData;

      const owner = el.closest("[data-cat], .cat-card, .cat-item");
      if (owner instanceof Element) {
        const ownerData = String(owner.getAttribute("data-cat") || "").trim();
        if (ownerData) return ownerData;
        const txt = owner.querySelector(".cat-label, .cat-name");
        if (txt) {
          const value = String(txt.textContent || "").trim();
          if (value) return value;
        }
      }
      return "";
    };

    const goCategorySearch = (categoria) => {
      const termo = String(categoria || "").trim();
      if (!termo) return;
      try { window.salvarBusca?.(termo); } catch (_e) {}
      const target = `busca.html?q=${encodeURIComponent(termo)}&src=categoria_home`;
      if (typeof window.__DOKE_V2_NAVIGATE__ === "function") {
        safeInvoke(() => window.__DOKE_V2_NAVIGATE__(target));
        return;
      }
      if (typeof window.dokeNavigateHtml === "function") {
        safeInvoke(() => window.dokeNavigateHtml(target));
        return;
      }
      location.href = target;
    };

    // Fallback delegado: se algum renderer esquecer os listeners locais, o clique ainda navega.
    on(page, "click", (ev) => {
      const t = ev.target;
      if (!(t instanceof Element)) return;
      if (t.closest(".cat-prev, .cat-next, .pro-arrow")) return;
      const hit = t.closest("[data-cat], .cat-card, .cat-item, .cat-ico, .cat-icon-wrap");
      if (!(hit instanceof Element)) return;
      const categoria = extractCategoryName(hit);
      if (!categoria) return;
      ev.preventDefault();
      goCategorySearch(categoria);
    }, true);
  }

  function bindHomeHorizontalArrows(page, on) {
    if (!(page instanceof Element)) return;
    const bindLane = (trackSel, prevSel, nextSel) => {
      const track = page.querySelector(trackSel);
      const prev = page.querySelector(prevSel);
      const next = page.querySelector(nextSel);
      if (!(track instanceof HTMLElement) || !(prev instanceof HTMLButtonElement) || !(next instanceof HTMLButtonElement)) return;
      track.style.overflowX = "auto";
      track.style.overflowY = "hidden";
      track.style.scrollBehavior = "smooth";
      track.style.flexWrap = "nowrap";
      const scrollByPage = (dir) => {
        const amount = Math.max(240, Math.floor(track.clientWidth * 0.85));
        track.scrollBy({ left: dir * amount, behavior: "smooth" });
      };
      const update = () => {
        const maxLeft = Math.max(0, track.scrollWidth - track.clientWidth);
        prev.disabled = track.scrollLeft <= 2;
        next.disabled = track.scrollLeft >= maxLeft - 2;
      };
      on(prev, "click", () => scrollByPage(-1));
      on(next, "click", () => scrollByPage(1));
      on(track, "scroll", update, { passive: true });
      try {
        if ("ResizeObserver" in window) {
          const ro = new ResizeObserver(update);
          ro.observe(track);
        }
      } catch (_e) {}
      try {
        if ("MutationObserver" in window) {
          const mo = new MutationObserver(update);
          mo.observe(track, { childList: true });
        }
      } catch (_e) {}
      try { window.setTimeout(update, 90); } catch (_e) {}
    };
    bindLane("#galeria-dinamica", ".vid-prev", ".vid-next");
    bindLane("#feed-global-container", ".pub-prev", ".pub-next");
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
    try { document.body.setAttribute("data-page", "home"); } catch (_e) {}
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
      bindHomeCategories(page, on);
      bindHomeHorizontalArrows(page, on);
      normalizeHomeVideoLane(page);
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
