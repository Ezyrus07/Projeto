(() => {
  const key = "__DOKE_V2_PAGE_SEARCH__";
  if (window[key]) return;

  let cachedLayout = null;
  let pageBuscaScriptPromise = null;
  let pageBuscaCssLoaded = false;
  const INLINE_STYLE_ID = "doke-v2-busca-inline-style";

  function fixMojibake(text) {
    const value = String(text || "");
    try {
      return decodeURIComponent(escape(value));
    } catch (_e) {
      return value;
    }
  }

  function safeInvoke(fn) {
    if (typeof fn !== "function") return;
    try {
      const out = fn();
      if (out && typeof out.then === "function") out.catch(() => {});
    } catch (_e) {}
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

  async function loadSearchLayout() {
    if (cachedLayout) return cachedLayout;
    try {
      const res = await fetch("busca.html", { credentials: "same-origin" });
      const htmlRaw = await res.text();
      const html = fixMojibake(htmlRaw);
      const doc = new DOMParser().parseFromString(html, "text/html");
      const main = doc.querySelector("main");
      const footer = doc.querySelector("footer.main-footer, footer");
      const inlineStyles = Array.from(doc.querySelectorAll("head style"))
        .map((styleEl) => String(styleEl.textContent || ""))
        .join("\n\n");
      cachedLayout = {
        mainHtml: main ? main.outerHTML : "",
        footerHtml: footer ? footer.outerHTML : "",
        inlineStyles
      };
    } catch (_e) {
      cachedLayout = { mainHtml: "", footerHtml: "", inlineStyles: "" };
    }
    return cachedLayout;
  }

  async function ensureBuscaPageScriptLoaded() {
    if (pageBuscaScriptPromise) return pageBuscaScriptPromise;
    pageBuscaScriptPromise = new Promise((resolve) => {
      const existing = document.querySelector("script[data-v2-busca='1']");
      if (existing) {
        resolve();
        return;
      }
      const s = document.createElement("script");
      s.src = "page-busca.js?v=20260306v02";
      s.defer = true;
      s.dataset.v2Busca = "1";
      s.onload = () => resolve();
      s.onerror = () => resolve();
      document.head.appendChild(s);
    });
    return pageBuscaScriptPromise;
  }

  function ensureBuscaPageStylesLoaded() {
    if (pageBuscaCssLoaded) return;
    const href = "page-busca.css?v=20260308v08";
    const exists = Array.from(document.querySelectorAll("link[rel='stylesheet']")).some(
      (link) => String(link.getAttribute("href") || "").includes("page-busca.css")
    );
    if (!exists) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.dataset.v2Busca = "1";
      document.head.appendChild(link);
    }
    pageBuscaCssLoaded = true;
  }

  function ensureBuscaInlineStylesLoaded(cssText) {
    const text = String(cssText || "").trim();
    if (!text) return;
    let style = document.getElementById(INLINE_STYLE_ID);
    if (!(style instanceof HTMLStyleElement)) {
      style = document.createElement("style");
      style.id = INLINE_STYLE_ID;
      document.head.appendChild(style);
    }
    if (String(style.textContent || "").trim() !== text) {
      style.textContent = text;
    }
  }

  function bindFallbackFiltersDrawer(page, onTeardown) {
    const btn = page.querySelector("#btnOpenFilters");
    const backdrop = page.querySelector("#filtersBackdrop");
    const aside = page.querySelector(".filters-sidebar");
    if (!btn || !backdrop || !aside) return;

    const open = () => {
      document.body.classList.add("filters-open");
      btn.setAttribute("aria-expanded", "true");
    };
    const close = () => {
      document.body.classList.remove("filters-open");
      btn.setAttribute("aria-expanded", "false");
    };
    const toggle = () => (document.body.classList.contains("filters-open") ? close() : open());

    const onBtn = (e) => { e.preventDefault(); toggle(); };
    const onBackdrop = () => close();
    const onEsc = (e) => {
      if (e.key === "Escape") close();
    };

    btn.setAttribute("aria-expanded", "false");
    close();
    btn.addEventListener("click", onBtn);
    backdrop.addEventListener("click", onBackdrop);
    document.addEventListener("keydown", onEsc);

    if (typeof onTeardown === "function") {
      onTeardown(() => {
        try { btn.removeEventListener("click", onBtn); } catch (_e) {}
        try { backdrop.removeEventListener("click", onBackdrop); } catch (_e) {}
        try { document.removeEventListener("keydown", onEsc); } catch (_e) {}
        close();
      });
    }
  }

  function ensureSearchDropdownMarkup(page) {
    if (!(page instanceof Element)) return null;
    const wrapper = page.querySelector("#buscaWrapper");
    if (!(wrapper instanceof HTMLElement)) return null;
    let dropdown = page.querySelector("#buscaDropdown");
    if (dropdown instanceof HTMLElement) return dropdown;
    dropdown = document.createElement("div");
    dropdown.id = "buscaDropdown";
    dropdown.className = "busca-dropdown";
    dropdown.innerHTML = `
      <div class="busca-hint">Buscas recentes</div>
      <div id="containerHistorico" class="historico-busca">
        <div id="listaRecentes"></div>
        <button id="limparHistoricoBtn" class="limpar-historico-btn" type="button">Limpar historico</button>
      </div>
    `;
    wrapper.appendChild(dropdown);
    return dropdown;
  }

  function bindSearchAutocomplete(page, onTeardown) {
    if (!(page instanceof Element)) return;
    const input = page.querySelector("#inputBusca");
    const wrapper = page.querySelector("#buscaWrapper");
    const submitBtn = page.querySelector(".btn-search-circle");
    const dropdown = ensureSearchDropdownMarkup(page);
    if (!(input instanceof HTMLInputElement) || !(wrapper instanceof HTMLElement) || !(dropdown instanceof HTMLElement)) return;

    const teardown = [];
    const on = (target, type, handler, options) => {
      if (!target || typeof target.addEventListener !== "function") return;
      target.addEventListener(type, handler, options);
      teardown.push(() => {
        try { target.removeEventListener(type, handler, options); } catch (_e) {}
      });
    };

    const listEl = dropdown.querySelector("#listaRecentes");
    const clearBtn = dropdown.querySelector("#limparHistoricoBtn");
    const dropdownParent = dropdown.parentNode;
    const dropdownNextSibling = dropdown.nextSibling;
    let suggestionsEl = dropdown.querySelector("#dokeSugestoes");
    let dropdownPortaled = false;
    let dropdownRafId = 0;
    if (!(suggestionsEl instanceof HTMLElement)) {
      suggestionsEl = document.createElement("div");
      suggestionsEl.id = "dokeSugestoes";
      dropdown.appendChild(suggestionsEl);
    }

    const esc = (value) => String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

    const readHistory = () => {
      try {
        const parsed = JSON.parse(localStorage.getItem("doke_historico_busca") || "[]");
        return Array.isArray(parsed) ? parsed.map((item) => String(item || "").trim()).filter(Boolean) : [];
      } catch (_e) {
        return [];
      }
    };

    const suggestionsBase = ["Eletricista", "Pintor", "Encanador", "Diarista", "Design", "Aulas"];

    const clearFloating = () => {
      dropdown.classList.remove("is-floating");
      dropdown.style.position = "";
      dropdown.style.left = "";
      dropdown.style.top = "";
      dropdown.style.width = "";
      dropdown.style.zIndex = "";
      dropdown.style.maxHeight = "";
      dropdown.style.overflow = "";
      dropdown.style.display = "";
    };

    const mountToBody = () => {
      if (dropdownPortaled) return;
      try {
        dropdown.dataset.portalActive = "1";
        document.body.appendChild(dropdown);
        dropdownPortaled = true;
      } catch (_e) {}
    };

    const restoreToWrapper = () => {
      if (!dropdownPortaled || !dropdownParent) return;
      try {
        if (dropdownNextSibling && dropdownNextSibling.parentNode === dropdownParent) {
          dropdownParent.insertBefore(dropdown, dropdownNextSibling);
        } else {
          dropdownParent.appendChild(dropdown);
        }
        delete dropdown.dataset.portalActive;
        dropdownPortaled = false;
      } catch (_e) {}
    };

    const positionFloating = () => {
      if (!wrapper.classList.contains("active")) return;
      const rect = wrapper.getBoundingClientRect();
      const viewportWidth = document.documentElement.clientWidth || window.innerWidth || 0;
      const gutter = 12;
      const width = Math.max(240, Math.round(rect.width));
      const left = Math.max(gutter, Math.min(Math.round(rect.left), viewportWidth - width - gutter));
      const top = Math.round(rect.bottom + 10);
      const maxH = Math.max(180, Math.min(420, Math.round((window.innerHeight || 0) - top - gutter)));
      dropdown.classList.add("is-floating");
      dropdown.style.position = "fixed";
      dropdown.style.left = `${left}px`;
      dropdown.style.top = `${top}px`;
      dropdown.style.width = `${width}px`;
      dropdown.style.zIndex = "2147483000";
      dropdown.style.maxHeight = `${maxH}px`;
      dropdown.style.overflow = "auto";
      dropdown.style.display = "block";
    };

    const schedulePosition = () => {
      if (!wrapper.classList.contains("active")) return;
      if (dropdownRafId) cancelAnimationFrame(dropdownRafId);
      dropdownRafId = requestAnimationFrame(() => {
        dropdownRafId = 0;
        positionFloating();
      });
    };

    const openDropdown = () => {
      wrapper.classList.add("active");
      mountToBody();
      schedulePosition();
    };

    const closeDropdown = () => {
      if (dropdownRafId) {
        cancelAnimationFrame(dropdownRafId);
        dropdownRafId = 0;
      }
      wrapper.classList.remove("active");
      dropdown.style.display = "none";
      clearFloating();
      restoreToWrapper();
    };

    const renderHistory = () => {
      if (!(listEl instanceof HTMLElement)) return;
      const history = readHistory();
      const container = dropdown.querySelector("#containerHistorico");
      if (!(container instanceof HTMLElement)) return;
      if (!history.length) {
        container.style.display = "none";
        listEl.innerHTML = "";
        return;
      }
      container.style.display = "block";
      listEl.innerHTML = history.slice(0, 8).map((term) => `
        <div class="recent-item" data-term="${esc(term)}">
          <i class='bx bx-time-five history-icon'></i>
          <span class="recent-text">${esc(term)}</span>
        </div>
      `).join("");
      listEl.querySelectorAll(".recent-item").forEach((item) => {
        item.addEventListener("click", () => {
          const term = String(item.getAttribute("data-term") || "");
          input.value = term;
          closeDropdown();
          safeInvoke(() => window.novaBusca && window.novaBusca());
        });
      });
    };

    const renderSuggestions = () => {
      if (!(suggestionsEl instanceof HTMLElement)) return;
      const query = String(input.value || "").trim().toLowerCase();
      const history = readHistory();
      const pool = [...new Set([...history, ...suggestionsBase])];
      const items = pool
        .filter(Boolean)
        .filter((term) => !query || String(term).toLowerCase().includes(query))
        .slice(0, 6);
      if (!items.length) {
        suggestionsEl.innerHTML = "";
        return;
      }
      suggestionsEl.innerHTML = `
        <div class="sug-title">Ideias para buscar</div>
        <div class="sug-list">
          ${items.map((term) => `
            <button class="sug-item" type="button" data-term="${esc(term)}">
              <span class="sug-left">
                <span class="sug-dot"></span>
                <span class="sug-text">${esc(term)}</span>
              </span>
            </button>
          `).join("")}
        </div>
      `;
      suggestionsEl.querySelectorAll(".sug-item").forEach((item) => {
        item.addEventListener("click", () => {
          const term = String(item.getAttribute("data-term") || "");
          input.value = term;
          closeDropdown();
          safeInvoke(() => window.novaBusca && window.novaBusca());
        });
      });
    };

    const refresh = () => {
      renderHistory();
      renderSuggestions();
    };

    on(input, "focus", () => {
      refresh();
      openDropdown();
    });
    on(input, "input", () => {
      refresh();
      openDropdown();
    });
    on(input, "blur", () => {
      window.setTimeout(() => {
        const active = document.activeElement;
        if ((active instanceof Node) && (wrapper.contains(active) || dropdown.contains(active))) return;
        closeDropdown();
      }, 0);
    });
    on(window, "resize", schedulePosition, { passive: true });
    on(window, "scroll", schedulePosition, { passive: true });
    on(document, "pointerdown", (event) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (wrapper.contains(target)) return;
      if (dropdown.contains(target)) return;
      closeDropdown();
    }, true);
    on(document, "keydown", (event) => {
      if (event.key === "Escape") closeDropdown();
    });

    if (clearBtn instanceof HTMLButtonElement) {
      on(clearBtn, "click", (event) => {
        event.preventDefault();
        try { localStorage.removeItem("doke_historico_busca"); } catch (_e) {}
        refresh();
      });
    }

    if (submitBtn instanceof HTMLButtonElement) {
      on(submitBtn, "click", () => closeDropdown());
    }

    refresh();
    closeDropdown();

    if (typeof onTeardown === "function") {
      onTeardown(() => {
        teardown.splice(0).forEach((fn) => {
          try { fn(); } catch (_e) {}
        });
        closeDropdown();
      });
    }
  }


  function bindSearchFilters(page, onTeardown) {
    if (!(page instanceof Element)) return;
    stripInlineHandlers(page.querySelector(".filters-sidebar") || page, "[onclick],[onchange],[oninput]");
    stripInlineHandlers(page.querySelector(".doke-toolbar") || page, "[onclick],[onchange],[oninput]");
    const teardown = [];
    const on = (target, type, handler, options) => {
      if (!target || typeof target.addEventListener !== "function") return;
      target.addEventListener(type, handler, options);
      teardown.push(() => {
        try { target.removeEventListener(type, handler, options); } catch (_e) {}
      });
    };

    const applySearch = () => {
      syncLocationState();
      persistSearchState();
      safeInvoke(() => window.aplicarFiltrosBusca && window.aplicarFiltrosBusca());
    };

    const controls = {
      ordenacao: page.querySelector("#filtroOrdenacao"),
      preco: page.querySelector("#filtroPreco"),
      estado: page.querySelector("#selectEstado"),
      cidade: page.querySelector("#selectCidade"),
      bairro: page.querySelector("#selectBairro"),
      raio: page.querySelector("#filtroRaio"),
      categoria: page.querySelector("#filtroCategoria"),
      tipoPreco: page.querySelector("#filtroTipoPreco"),
      garantia: page.querySelector("#filtroGarantia"),
      emergencia: page.querySelector("#filtroEmergencia"),
      formulario: page.querySelector("#filtroFormulario"),
      pix: page.querySelector("#filtroPgPix"),
      credito: page.querySelector("#filtroPgCredito"),
      debito: page.querySelector("#filtroPgDebito"),
      sortMirror: page.querySelector("#dokeSortMirror")
    };

    const radioTipo = Array.from(page.querySelectorAll('input[name="tipoAtend"]'));
    const chipWraps = Array.from(page.querySelectorAll(".filtros-chips-scroll"));
    const quickButtons = Array.from(page.querySelectorAll("[data-chip-toggle]"));
    const clearBtn = page.querySelector(".btn-clean-filters");

    const syncLocationState = () => {
      const estado = controls.estado instanceof HTMLSelectElement ? String(controls.estado.value || "").trim() : "";
      const cidade = controls.cidade instanceof HTMLSelectElement ? String(controls.cidade.value || "").trim() : "";
      if (controls.cidade instanceof HTMLSelectElement) controls.cidade.disabled = !estado;
      if (controls.bairro instanceof HTMLSelectElement) controls.bairro.disabled = !cidade;
    };

    const setActiveChip = (value) => {
      const current = String(value || "todos");
      chipWraps.forEach((wrap) => {
        wrap.querySelectorAll(".chip-tag").forEach((chip) => {
          chip.classList.toggle("ativo", String(chip.getAttribute("data-chip") || "") === current);
        });
      });
    };

    const syncQuickButtons = () => {
      quickButtons.forEach((btn) => {
        const key = String(btn.getAttribute("data-chip-toggle") || "");
        const input = key ? page.querySelector(`#${key}`) : null;
        const active = !!(input instanceof HTMLInputElement && input.checked);
        btn.classList.toggle("is-active", active);
        btn.setAttribute("aria-pressed", active ? "true" : "false");
      });
    };

    const persistSearchState = () => {
      try {
        const payload = {
          ordenacao: controls.ordenacao instanceof HTMLSelectElement ? controls.ordenacao.value : "",
          preco: controls.preco instanceof HTMLInputElement ? controls.preco.value : "",
          estado: controls.estado instanceof HTMLSelectElement ? controls.estado.value : "",
          cidade: controls.cidade instanceof HTMLSelectElement ? controls.cidade.value : "",
          bairro: controls.bairro instanceof HTMLSelectElement ? controls.bairro.value : "",
          raio: controls.raio instanceof HTMLSelectElement ? controls.raio.value : "",
          categoria: controls.categoria instanceof HTMLSelectElement ? controls.categoria.value : "",
          tipoPreco: controls.tipoPreco instanceof HTMLSelectElement ? controls.tipoPreco.value : "",
          chip: String(window.__dokeChipFiltro || "todos"),
          tipoAtend: (radioTipo.find((node) => node instanceof HTMLInputElement && node.checked) || {}).value || "todos",
          checks: {
            garantia: !!(controls.garantia instanceof HTMLInputElement && controls.garantia.checked),
            emergencia: !!(controls.emergencia instanceof HTMLInputElement && controls.emergencia.checked),
            formulario: !!(controls.formulario instanceof HTMLInputElement && controls.formulario.checked),
            pix: !!(controls.pix instanceof HTMLInputElement && controls.pix.checked),
            credito: !!(controls.credito instanceof HTMLInputElement && controls.credito.checked),
            debito: !!(controls.debito instanceof HTMLInputElement && controls.debito.checked)
          }
        };
        localStorage.setItem("doke_search_filters_v2", JSON.stringify(payload));
      } catch (_e) {}
    };

    const restoreSearchState = () => {
      try {
        const raw = localStorage.getItem("doke_search_filters_v2") || "";
        if (!raw) return;
        const payload = JSON.parse(raw);
        if (controls.ordenacao instanceof HTMLSelectElement && payload.ordenacao) controls.ordenacao.value = payload.ordenacao;
        if (controls.sortMirror instanceof HTMLSelectElement && payload.ordenacao) controls.sortMirror.value = payload.ordenacao;
        if (controls.preco instanceof HTMLInputElement && payload.preco) controls.preco.value = payload.preco;
        if (controls.estado instanceof HTMLSelectElement && payload.estado) controls.estado.value = payload.estado;
        if (controls.cidade instanceof HTMLSelectElement && payload.cidade) controls.cidade.value = payload.cidade;
        if (controls.bairro instanceof HTMLSelectElement && payload.bairro) controls.bairro.value = payload.bairro;
        if (controls.raio instanceof HTMLSelectElement && payload.raio) controls.raio.value = payload.raio;
        if (controls.categoria instanceof HTMLSelectElement && payload.categoria) controls.categoria.value = payload.categoria;
        if (controls.tipoPreco instanceof HTMLSelectElement && payload.tipoPreco) controls.tipoPreco.value = payload.tipoPreco;
        if (payload.tipoAtend) {
          radioTipo.forEach((node) => { if (node instanceof HTMLInputElement) node.checked = node.value === payload.tipoAtend; });
        }
        const checks = payload.checks || {};
        if (controls.garantia instanceof HTMLInputElement) controls.garantia.checked = !!checks.garantia;
        if (controls.emergencia instanceof HTMLInputElement) controls.emergencia.checked = !!checks.emergencia;
        if (controls.formulario instanceof HTMLInputElement) controls.formulario.checked = !!checks.formulario;
        if (controls.pix instanceof HTMLInputElement) controls.pix.checked = !!checks.pix;
        if (controls.credito instanceof HTMLInputElement) controls.credito.checked = !!checks.credito;
        if (controls.debito instanceof HTMLInputElement) controls.debito.checked = !!checks.debito;
        window.__dokeChipFiltro = payload.chip || window.__dokeChipFiltro || "todos";
      } catch (_e) {}
      syncLocationState();
      setActiveChip(window.__dokeChipFiltro || "todos");
      syncQuickButtons();
    };

    const filterControls = [
      controls.ordenacao, controls.preco, controls.estado, controls.cidade, controls.bairro,
      controls.raio, controls.categoria, controls.tipoPreco, controls.garantia, controls.emergencia,
      controls.formulario, controls.pix, controls.credito, controls.debito
    ];

    filterControls.forEach((node) => {
      if (!(node instanceof Element)) return;
      const evt = (node instanceof HTMLInputElement && node.type === "number") ? "input" : "change";
      on(node, evt, () => {
        if (node === controls.estado) {
          if (controls.cidade instanceof HTMLSelectElement) controls.cidade.value = "";
          if (controls.bairro instanceof HTMLSelectElement) controls.bairro.value = "";
        }
        if (node === controls.cidade && controls.bairro instanceof HTMLSelectElement) controls.bairro.value = "";
        syncLocationState();
      });
    });

    filterControls.forEach((node) => {
      if (!(node instanceof Element)) return;
      const evt = (node instanceof HTMLInputElement && node.type === "number") ? "input" : "change";
      on(node, evt, () => applySearch());
    });

    radioTipo.forEach((node) => on(node, "change", () => applySearch()));

    if (controls.sortMirror instanceof HTMLSelectElement && controls.ordenacao instanceof HTMLSelectElement) {
      controls.sortMirror.value = controls.ordenacao.value;
      on(controls.sortMirror, "change", () => {
        controls.ordenacao.value = controls.sortMirror.value;
        applySearch();
      });
      on(controls.ordenacao, "change", () => {
        controls.sortMirror.value = controls.ordenacao.value;
      });
    }

    chipWraps.forEach((wrap) => {
      wrap.querySelectorAll(".chip-tag").forEach((chip) => {
        on(chip, "click", (ev) => {
          ev.preventDefault();
          const next = String(chip.getAttribute("data-chip") || "todos");
          window.__dokeChipFiltro = next;
          setActiveChip(next);
          persistSearchState();
          applySearch();
        });
      });
    });

    quickButtons.forEach((btn) => {
      on(btn, "click", (ev) => {
        ev.preventDefault();
        const key = String(btn.getAttribute("data-chip-toggle") || "");
        const input = key ? page.querySelector(`#${key}`) : null;
        if (!(input instanceof HTMLInputElement)) return;
        input.checked = !input.checked;
        syncQuickButtons();
        applySearch();
      });
    });

    [controls.garantia, controls.emergencia, controls.formulario, controls.pix, controls.credito, controls.debito].forEach((input) => {
      if (!(input instanceof HTMLInputElement)) return;
      on(input, "change", () => syncQuickButtons());
    });

    if (clearBtn instanceof HTMLButtonElement) {
      on(clearBtn, "click", (ev) => {
        ev.preventDefault();
        safeInvoke(() => window.limparFiltros && window.limparFiltros());
        window.setTimeout(() => {
          window.__dokeChipFiltro = "todos";
          syncLocationState();
          setActiveChip("todos");
          syncQuickButtons();
          persistSearchState();
        }, 40);
      });
    }

    let applyBtn = page.querySelector("#btnAplicarBuscaV2");
    if (!(applyBtn instanceof HTMLButtonElement)) {
      const host = page.querySelector(".filters-sidebar");
      if (host instanceof HTMLElement) {
        const wrap = document.createElement("div");
        wrap.className = "doke-v2-search-apply-wrap";
        wrap.innerHTML = '<button class="doke-v2-search-apply" id="btnAplicarBuscaV2" type="button">Aplicar filtros</button>';
        host.appendChild(wrap);
        applyBtn = wrap.querySelector("#btnAplicarBuscaV2");
      }
    }
    if (applyBtn instanceof HTMLButtonElement) {
      on(applyBtn, "click", (ev) => {
        ev.preventDefault();
        applySearch();
        safeInvoke(() => window.dokeToast && window.dokeToast("Filtros aplicados"));
        try { document.body.classList.remove("filters-open"); } catch (_e) {}
      });
    }

    const geoButtons = Array.from(page.querySelectorAll("#btnCepInlineBusca, .btn-loc"));
    geoButtons.forEach((btn) => on(btn, "click", () => {
      window.setTimeout(() => {
        syncLocationState();
        persistSearchState();
        applySearch();
      }, 260);
    }));

    restoreSearchState();
    try {
      const t1 = window.setTimeout(() => restoreSearchState(), 420);
      const t2 = window.setTimeout(() => restoreSearchState(), 900);
      teardown.push(() => { try { window.clearTimeout(t1); } catch (_e) {} });
      teardown.push(() => { try { window.clearTimeout(t2); } catch (_e) {} });
    } catch (_e) {}

    if (typeof onTeardown === "function") {
      onTeardown(() => {
        teardown.splice(0).forEach((fn) => {
          try { fn(); } catch (_e) {}
        });
      });
    }
  }

  function hydrateSearch(page) {
    if (!(page instanceof Element)) return;
    try { document.body.setAttribute("data-page", "busca"); } catch (_e) {}
    try { document.body.classList.remove("filters-open"); } catch (_e) {}

    const params = new URLSearchParams(location.search || "");
    const termo = String(params.get("q") || "").trim();
    const input = page.querySelector("#inputBusca");
    if (input instanceof HTMLInputElement && termo) input.value = termo;

    safeInvoke(() => window.carregarFiltrosLocalizacao && window.carregarFiltrosLocalizacao());
    safeInvoke(() => window.aplicarFiltrosBusca && window.aplicarFiltrosBusca());
    safeInvoke(() => window.novaBusca && window.novaBusca());
  }

  async function mountSearch(ctx) {
    const page = document.createElement("section");
    page.className = "doke-v2-page doke-v2-page-search";
    const teardown = [];
    const onTeardown = (fn) => {
      if (typeof fn === "function") teardown.push(fn);
    };

    const layout = await loadSearchLayout();
    if (layout && layout.mainHtml) {
      const tplMain = document.createElement("template");
      tplMain.innerHTML = layout.mainHtml;
      const main = tplMain.content.querySelector("main");
      if (main) page.appendChild(main);

      if (layout.footerHtml) {
        const tplFooter = document.createElement("template");
        tplFooter.innerHTML = layout.footerHtml;
        const footer = tplFooter.content.querySelector("footer.main-footer, footer");
        if (footer) page.appendChild(footer);
      }
    } else {
      page.innerHTML = `
        <div class="doke-v2-card">
          <h1>Busca em migraÃ§Ã£o</h1>
          <p>NÃ£o foi possÃ­vel carregar o layout original de <strong>busca.html</strong>.</p>
        </div>
      `;
    }

    ctx.root.appendChild(page);
    ensureBuscaPageStylesLoaded();
    ensureBuscaInlineStylesLoaded(layout?.inlineStyles);
    bindSearchAutocomplete(page, onTeardown);
    hydrateSearch(page);
    bindFallbackFiltersDrawer(page, onTeardown);
    bindSearchFilters(page, onTeardown);
    await ensureBuscaPageScriptLoaded();
    hydrateSearch(page);
    try { window.setTimeout(() => hydrateSearch(page), 420); } catch (_e) {}

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

  window[key] = { mountSearch };
})();
