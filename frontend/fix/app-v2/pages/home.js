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

  function stripInlineHandlers(scope, selector) {
    const root = scope instanceof Element ? scope : null;
    if (!root) return;
    root.querySelectorAll(selector || "[onclick],[onchange],[oninput]").forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      node.removeAttribute("onclick");
      node.removeAttribute("onchange");
      node.removeAttribute("oninput");
    });
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
    on(document, "pointerdown", (e) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      const insideWrapper = !!(wrapper && wrapper.contains(t));
      const insideDropdown = !!(dropdownBusca && dropdownBusca.contains(t));
      if (!insideWrapper && !insideDropdown) closeDropdown();
    }, true);
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

    const render = () => {
      if (stopped || !el.isConnected) return;
      el.textContent = frases[fraseIndex];
      fraseIndex = (fraseIndex + 1) % frases.length;
      timer = window.setTimeout(render, 2200);
    };

    el.textContent = frases[0];
    timer = window.setTimeout(render, 2200);
    if (typeof onTeardown === "function") {
      onTeardown(() => {
        stopped = true;
        if (timer) {
          try { window.clearTimeout(timer); } catch (_e) {}
        }
      });
    }
  }

  function bindHomeFilters(page, on, onTeardown) {
    if (!(page instanceof Element)) return;
    stripInlineHandlers(page.querySelector(".filtros-container-premium") || page, "[onclick],[onchange],[oninput]");
    const syncExpandedState = (open) => {
      const area = page.querySelector("#filtrosExtras");
      const btn = page.querySelector(".btn-toggle-filtros");
      const text = btn ? btn.querySelector(".btn-toggle-filtros-text") : null;
      const container = area ? area.closest(".filtros-container-premium") : null;
      if (area instanceof HTMLElement) area.classList.toggle("aberto", !!open);
      if (btn instanceof HTMLElement) {
        btn.classList.toggle("is-open", !!open);
        btn.setAttribute("aria-expanded", open ? "true" : "false");
      }
      if (container instanceof HTMLElement) container.classList.toggle("filtros-expanded", !!open);
      if (text instanceof HTMLElement) text.textContent = open ? "Esconder filtros" : "Mostrar filtros";
    };

    const btnAplicar = page.querySelector("#btn-aplicar");
    const toggleBtn = page.querySelector(".btn-toggle-filtros");
    const filtrosArea = page.querySelector("#filtrosExtras");
    const selects = {
      estado: page.querySelector("#selectEstado"),
      cidade: page.querySelector("#selectCidade"),
      bairro: page.querySelector("#selectBairro")
    };

    const syncLocationState = () => {
      const estado = selects.estado instanceof HTMLSelectElement ? String(selects.estado.value || "").trim() : "";
      const cidade = selects.cidade instanceof HTMLSelectElement ? String(selects.cidade.value || "").trim() : "";
      if (selects.cidade instanceof HTMLSelectElement) selects.cidade.disabled = !estado;
      if (selects.bairro instanceof HTMLSelectElement) selects.bairro.disabled = !cidade;
    };

    const persistLocationState = () => {
      try {
        const payload = {
          estado: selects.estado instanceof HTMLSelectElement ? String(selects.estado.value || "") : "",
          cidade: selects.cidade instanceof HTMLSelectElement ? String(selects.cidade.value || "") : "",
          bairro: selects.bairro instanceof HTMLSelectElement ? String(selects.bairro.value || "") : ""
        };
        localStorage.setItem("doke_home_filters_location_v2", JSON.stringify(payload));
      } catch (_e) {}
    };

    const restoreLocationState = () => {
      try {
        const raw = localStorage.getItem("doke_home_filters_location_v2") || "";
        if (!raw) return;
        const payload = JSON.parse(raw);
        if (selects.estado instanceof HTMLSelectElement && payload.estado) selects.estado.value = payload.estado;
        if (selects.cidade instanceof HTMLSelectElement && payload.cidade) selects.cidade.value = payload.cidade;
        if (selects.bairro instanceof HTMLSelectElement && payload.bairro) selects.bairro.value = payload.bairro;
      } catch (_e) {}
      syncLocationState();
    };

    const applyNow = () => {
      syncLocationState();
      persistLocationState();
      safeInvoke(() => window.dokePopulateCategoryFilters && window.dokePopulateCategoryFilters());
      safeInvoke(() => window.dokeApplyHomeFilters && window.dokeApplyHomeFilters());
    };
    let debounce = 0;
    const scheduleApply = () => {
      try { if (debounce) window.clearTimeout(debounce); } catch (_e) {}
      debounce = window.setTimeout(() => {
        debounce = 0;
        applyNow();
      }, 120);
    };

    const liveSelectors = [
      "#maxPreco",
      "#ordenacao",
      "#filtroCategoria",
      "#filtroTipoAtend",
      "#filtroTipoPreco",
      "#filtroPgPix",
      "#filtroPgCredito",
      "#filtroPgDebito",
      "#filtroGarantia",
      "#filtroEmergencia",
      "#filtroFormulario",
      "#selectEstado",
      "#selectCidade",
      "#selectBairro"
    ];

    liveSelectors.forEach((sel) => {
      page.querySelectorAll(sel).forEach((node) => {
        const evt = (node instanceof HTMLInputElement && (node.type === "checkbox" || node.type === "radio")) || node instanceof HTMLSelectElement
          ? "change"
          : "input";
        on(node, evt, () => {
          if (node === selects.estado) {
            if (selects.cidade instanceof HTMLSelectElement) selects.cidade.value = "";
            if (selects.bairro instanceof HTMLSelectElement) selects.bairro.value = "";
          }
          if (node === selects.cidade && selects.bairro instanceof HTMLSelectElement) selects.bairro.value = "";
          syncLocationState();
          scheduleApply();
        });
      });
    });

    on(btnAplicar, "click", (ev) => {
      ev.preventDefault();
      applyNow();
      safeInvoke(() => window.dokeToast && window.dokeToast("Filtros aplicados"));
    });

    try {
      if (toggleBtn instanceof HTMLElement) toggleBtn.removeAttribute("onclick");
    } catch (_e) {}

    on(toggleBtn, "click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const nextOpen = !(filtrosArea instanceof HTMLElement && filtrosArea.classList.contains("aberto"));
      safeInvoke(() => window.setFiltrosExtrasState && window.setFiltrosExtrasState(nextOpen));
      syncExpandedState(nextOpen);
    });

    try {
      safeInvoke(() => window.setFiltrosExtrasState && window.setFiltrosExtrasState(false));
      syncExpandedState(false);
    } catch (_e) {}

    try {
      const chipWrap = page.querySelector(".filtros-chips-scroll");
      if (chipWrap instanceof HTMLElement) {
        chipWrap.querySelectorAll(".chip-tag").forEach((chip) => {
          on(chip, "click", () => {
            window.__dokeChipFiltro = chip.getAttribute("data-chip") || "todos";
            chipWrap.querySelectorAll(".chip-tag").forEach((c) => c.classList.remove("ativo"));
            chip.classList.add("ativo");
            scheduleApply();
          });
        });
      }
    } catch (_e) {}

    restoreLocationState();
    syncLocationState();

    if (typeof onTeardown === "function") {
      onTeardown(() => {
        if (debounce) {
          try { window.clearTimeout(debounce); } catch (_e) {}
        }
      });
    }
  }


  function bindHomeCepSync(page, on) {
    if (!(page instanceof Element)) return;
    const cepIds = ["inputCep", "cepOrcamento", "cepEndereco", "cepBusca"];
    const cepSalvo = (() => {
      try { return localStorage.getItem("meu_cep_doke") || ""; } catch (_e) { return ""; }
    })();

    const syncCepValue = (value) => {
      const cep = String(value || "");
      if (cep.length < 5) return;
      safeInvoke(() => window.preencherTodosCeps && window.preencherTodosCeps(cep));
    };

    cepIds.forEach((id) => {
      page.querySelectorAll(`#${id}`).forEach((input) => {
        if (!(input instanceof HTMLInputElement)) return;
        if (cepSalvo && !input.value) input.value = cepSalvo;
        on(input, "input", (e) => {
          const node = e.currentTarget;
          if (!(node instanceof HTMLInputElement)) return;
          if (id === "inputCep") safeInvoke(() => window.formatarCepInput && window.formatarCepInput(e));
          syncCepValue(node.value);
        });
        if (id === "inputCep") {
          on(input, "keypress", (e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            safeInvoke(() => window.salvarCep && window.salvarCep());
          });
        }
      });
    });

    if (cepSalvo) {
      safeInvoke(() => window.atualizarTelaCep && window.atualizarTelaCep(cepSalvo));
      syncCepValue(cepSalvo);
      safeInvoke(async () => {
        try {
          const locSalva = JSON.parse(localStorage.getItem("doke_localizacao") || "null");
          const semEndereco = !locSalva || (!locSalva.cidade && !locSalva.bairro);
          const cepLimpo = String(cepSalvo).replace(/\D/g, "");
          if (!semEndereco || cepLimpo.length !== 8 || typeof window.buscarEnderecoPorCep !== "function") return;
          const payload = await window.buscarEnderecoPorCep(cepLimpo);
          if (!payload) return;
          localStorage.setItem("doke_localizacao", JSON.stringify(payload));
          safeInvoke(() => window.atualizarTelaCep && window.atualizarTelaCep(payload));
        } catch (_e) {}
      });
    }
  }

  function installHomeResilience(page, onTeardown) {
    if (!(page instanceof Element)) return;
    const timers = [];
    const later = (ms, fn) => {
      const id = window.setTimeout(() => {
        try { fn(); } catch (_e) {}
      }, ms);
      timers.push(id);
    };

    later(14000, () => {
      try {
        const reelsContainer = page.querySelector("#galeria-dinamica") || page.querySelector(".tiktok-scroll-wrapper");
        if (reelsContainer) {
          const hasRealCard = !!reelsContainer.querySelector('.dp-reelCard, .tiktok-card:not(.is-skeleton), video');
          const hasSkeleton = !!reelsContainer.querySelector('.is-skeleton, .skeleton');
          if (!hasRealCard && hasSkeleton) {
            reelsContainer.innerHTML = "<p style='color:white; padding:20px;'>Nao foi possivel carregar videos agora.</p>";
            reelsContainer.setAttribute("aria-busy", "false");
          }
        }
      } catch (_e) {}
      try {
        const feedContainer = page.querySelector("#feed-global-container");
        if (feedContainer) {
          const hasRealPost = !!feedContainer.querySelector('.feed-publicacao-card:not(.pub-skel), .card-feed-global, .dp-item:not(.pub-skel)');
          const hasSkeleton = !!feedContainer.querySelector('.pub-skel, .skeleton');
          if (!hasRealPost && hasSkeleton) {
            feedContainer.innerHTML = "<div class='dp-empty'>Nao foi possivel carregar publicacoes agora.</div>";
            feedContainer.setAttribute("aria-busy", "false");
          }
        }
      } catch (_e) {}
    });

    later(0, () => {
      const params = new URLSearchParams(location.search || "");
      const postParam = params.get("post");
      const commentParam = params.get("comment");
      const openReplies = params.get("reply") === "1";
      if (!postParam) return;
      window._dokePendingModalCommentId = commentParam || null;
      window._dokePendingModalOpenReplies = openReplies;
      if (postParam.startsWith("sb-")) {
        safeInvoke(async () => window.abrirModalPublicacao && window.abrirModalPublicacao(postParam.slice(3)));
      } else if (postParam.startsWith("fb-")) {
        safeInvoke(async () => window.abrirModalPost && window.abrirModalPost(postParam.slice(3), "posts"));
      }
    });

    if (typeof onTeardown === "function") {
      onTeardown(() => {
        timers.splice(0).forEach((id) => {
          try { window.clearTimeout(id); } catch (_e) {}
        });
      });
    }
  }

  function ensureHomeHeroContext(page) {
    if (!(page instanceof Element)) return;
    const hero = page.querySelector(".secao-busca");
    const buttons = page.querySelector(".botoes-busca");
    if (!(hero instanceof HTMLElement) || !(buttons instanceof HTMLElement)) return;
    let note = hero.querySelector(".doke-home-hero-note");
    if (!(note instanceof HTMLElement)) {
      note = document.createElement("p");
      note.className = "doke-home-hero-note";
      note.textContent = "Encontre servicos e profissionais com mais contexto.";
      buttons.insertAdjacentElement("beforebegin", note);
    }
  }

  function mountHomePageRuntime(page, on, onTeardown) {
    if (!(page instanceof Element)) return;
    ensureHomeHeroContext(page);
    bindHomeCepSync(page, on);
    installHomeResilience(page, onTeardown);
    safeInvoke(() => window.initIgSidebarSearch && window.initIgSidebarSearch());
    safeInvoke(() => window.__dokeHomeMountInit && window.__dokeHomeMountInit(page));
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
      safeInvoke(() => window.dokePopulateCategoryFilters && window.dokePopulateCategoryFilters());
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

  async function buildHomeFromFetch() {
    try {
      const res = await fetch("index.html", { credentials: "same-origin" });
      const htmlRaw = await res.text();
      const html = fixMojibake(String(htmlRaw || "")).trim();
      if (!html) return null;

      const doc = new DOMParser().parseFromString(html, "text/html");
      const main = doc.querySelector("main.dp-wrap") || doc.querySelector("main");
      if (!(main instanceof HTMLElement)) return null;

      const footerNode = doc.querySelector("footer.main-footer") || doc.querySelector("footer");
      const tplMain = document.createElement("template");
      tplMain.innerHTML = main.outerHTML;
      const mountMain = tplMain.content.querySelector("main.dp-wrap") || tplMain.content.querySelector("main");
      if (!(mountMain instanceof HTMLElement)) return null;

      let footer = null;
      if (footerNode instanceof HTMLElement) {
        const tplFooter = document.createElement("template");
        tplFooter.innerHTML = footerNode.outerHTML;
        const parsedFooter = tplFooter.content.querySelector("footer.main-footer") || tplFooter.content.querySelector("footer");
        if (parsedFooter instanceof HTMLElement) footer = parsedFooter;
      }

      return { main: mountMain, footer };
    } catch (_e) {
      return null;
    }
  }


  function hasRealHomeContent(container, selector, skeletonSelector) {
    if (!(container instanceof Element)) return false;
    const real = container.querySelector(selector);
    if (!real) return false;
    if (!skeletonSelector) return true;
    return !real.matches(skeletonSelector);
  }

  function installHomeSkeletonStability(page, onTeardown) {
    if (!(page instanceof Element)) return;
    page.classList.add("doke-v2-home-loading");
    const root = page.querySelector("main.dp-wrap") || page;
    const checks = [
      { id: "listaCategorias", real: ".cat-card:not(.cat-skel)", skel: ".cat-skel" },
      { id: "galeria-dinamica", real: ".dp-reelCard, .tiktok-card:not(.is-skeleton), video", skel: ".is-skeleton" },
      { id: "feed-global-container", real: ".feed-publicacao-card:not(.pub-skel), .card-feed-global, .dp-item:not(.pub-skel)", skel: ".pub-skel, .skeleton" },
      { id: "feedAnuncios", real: ".anuncio-card, .ad-card, .dp-card, article", skel: ".skeleton, .anuncio-skel" },
      { id: "prosDestaque", real: ".pro-card, .prof-card, .card-profissional, article", skel: ".skeleton, .pro-skel" }
    ];

    const evaluate = () => {
      const done = checks.every((cfg) => {
        const el = root.querySelector(`#${cfg.id}`);
        if (!(el instanceof Element)) return true;
        return hasRealHomeContent(el, cfg.real, cfg.skel);
      });
      if (done) page.classList.remove("doke-v2-home-loading");
    };

    const timers = [window.setTimeout(evaluate, 700), window.setTimeout(evaluate, 1800), window.setTimeout(() => page.classList.remove("doke-v2-home-loading"), 4200)];
    let mo = null;
    try {
      mo = new MutationObserver(() => evaluate());
      mo.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "aria-busy", "style"] });
    } catch (_e) {}
    evaluate();

    if (typeof onTeardown === "function") {
      onTeardown(() => {
        timers.forEach((id) => { try { clearTimeout(id); } catch (_e) {} });
        try { if (mo) mo.disconnect(); } catch (_e) {}
        try { page.classList.remove("doke-v2-home-loading"); } catch (_e) {}
      });
    }
  }

  async function mountHome(ctx) {
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

    let layout = buildHomeFromLegacyHtml();
    if (!(layout && layout.main instanceof HTMLElement)) {
      layout = await buildHomeFromFetch();
    }
    if (layout && layout.main) {
      page.appendChild(layout.main);
      if (layout.footer) page.appendChild(layout.footer);
      ctx.root.appendChild(page);
      try { stripInlineHandlers(page.querySelector(".filtros-container-premium") || page, ".btn-toggle-filtros,[onclick],[onchange],[oninput]"); } catch (_e) {}

      try { installHomeSkeletonStability(page, (fn) => teardown.push(fn)); } catch (_e) {}
      try { bindHomeSearch(page, on); } catch (_e) {}
      try { bindHomeCategories(page, on); } catch (_e) {}
      try { bindHomeHorizontalArrows(page, on); } catch (_e) {}
      try { bindHomeFilters(page, on, (fn) => teardown.push(fn)); } catch (_e) {}
      try { mountHomePageRuntime(page, on, (fn) => teardown.push(fn)); } catch (_e) {}
      try { normalizeHomeVideoLane(page); } catch (_e) {}
      try { startTypewriterEffect(page, (fn) => teardown.push(fn)); } catch (_e) {}

      // Roda hidratação após inserir no DOM para os loaders encontrarem os elementos.
      try {
        window.requestAnimationFrame(() => {
          try { hydrateHome(page); } catch (_e) {}
          try { window.dispatchEvent(new CustomEvent("doke:page-mount", { detail: { page: "home", root: page } })); } catch (_e) {}
          try { window.dispatchEvent(new Event("doke:page-ready")); } catch (_e) {}
        });
      } catch (_e) {
        try { hydrateHome(page); } catch (_e2) {}
        try { window.dispatchEvent(new CustomEvent("doke:page-mount", { detail: { page: "home", root: page } })); } catch (_e) {}
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
