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

    const open = () => document.body.classList.add("filters-open");
    const close = () => document.body.classList.remove("filters-open");
    const toggle = () => (document.body.classList.contains("filters-open") ? close() : open());

    const onBtn = (e) => { e.preventDefault(); toggle(); };
    const onBackdrop = () => close();
    const onEsc = (e) => {
      if (e.key === "Escape") close();
    };

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

  function hydrateSearch(page) {
    if (!(page instanceof Element)) return;
    try { document.body.setAttribute("data-page", "busca"); } catch (_e) {}

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
    hydrateSearch(page);
    bindFallbackFiltersDrawer(page, onTeardown);
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
