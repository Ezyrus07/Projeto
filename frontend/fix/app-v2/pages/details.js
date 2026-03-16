(() => {
  const key = "__DOKE_V2_PAGE_DETAILS__";
  if (window[key]) return;

  const INLINE_STYLE_ID = "doke-v2-detalhes-inline-style";
  let cachedLayout = null;

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

  async function loadDetailsLayout() {
    if (cachedLayout) return cachedLayout;
    try {
      const res = await fetch("detalhes.html", { credentials: "same-origin" });
      const htmlRaw = await res.text();
      const html = fixMojibake(htmlRaw);
      const doc = new DOMParser().parseFromString(html, "text/html");
      const main = doc.querySelector("main");
      const footer = doc.querySelector("footer.main-footer, footer");
      const inlineStyles = Array.from(doc.querySelectorAll("head style"))
        .map((styleEl) => String(styleEl.textContent || ""))
        .join("\n\n");
      const inlineScripts = Array.from(doc.querySelectorAll("body script:not([src])"))
        .map((s) => String(s.textContent || ""))
        .filter(Boolean);
      const runtimeScript = inlineScripts.find((txt) => txt.includes("initPage")) || "";
      cachedLayout = {
        mainHtml: main ? main.outerHTML : "",
        footerHtml: footer ? footer.outerHTML : "",
        inlineStyles,
        runtimeScript
      };
    } catch (_e) {
      cachedLayout = { mainHtml: "", footerHtml: "", inlineStyles: "", runtimeScript: "" };
    }
    return cachedLayout;
  }

  function ensureInlineStylesLoaded(cssText) {
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

  function adaptRuntimeScript(text) {
    let code = String(text || "");
    if (!code.trim()) return "";
    code = code.replace(
      "const params = new URLSearchParams(window.location.search);",
      "const params = new URLSearchParams(window.__DOKE_V2_ROUTE_SEARCH__ || window.location.search);"
    );
    code = code.replace(
      /document\.addEventListener\((['"])DOMContentLoaded\1\s*,\s*async\s*\(\)\s*=>\s*\{([\s\S]*?)\}\s*\);?/m,
      "(async () => {$2})();"
    );
    return code;
  }

  function runDetailsRuntime(routeSearch, runtimeScript) {
    const code = adaptRuntimeScript(runtimeScript);
    if (!code) return;
    try {
      window.__DOKE_V2_ROUTE_SEARCH__ = String(routeSearch || "");
      // Executa o script em escopo isolado para evitar colisões de const/let no global.
      const executor = new Function(code);
      executor.call(window);
    } catch (_e) {
      try { console.warn("[DOKE] detalhes runtime falhou", _e); } catch (__e) {}
    } finally {
      try { delete window.__DOKE_V2_ROUTE_SEARCH__; } catch (_e) {
        window.__DOKE_V2_ROUTE_SEARCH__ = "";
      }
    }
  }

  function hydrateDetailsPage(ctx, page) {
    if (!(page instanceof Element)) return;
    try { document.body.setAttribute("data-page", "detalhes"); } catch (_e) {}
    safeInvoke(() => window.dispatchEvent(new Event("resize")));
    const scrollToTop = () => {
      try { window.scrollTo({ top: 0, behavior: "auto" }); } catch (_e) {}
    };
    scrollToTop();
    try { window.setTimeout(scrollToTop, 40); } catch (_e) {}
    runDetailsRuntime(String(ctx?.search || ""), String((ctx && ctx.runtimeScript) || ""));
  }

  async function mountDetails(ctx) {
    const page = document.createElement("section");
    page.className = "doke-v2-page doke-v2-page-details";

    const layout = await loadDetailsLayout();
    const runtimeCtx = { search: ctx?.search || "", runtimeScript: layout?.runtimeScript || "" };

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
          <h1>Detalhes em migração</h1>
          <p>Não foi possível carregar o layout original de <strong>detalhes.html</strong>.</p>
        </div>
      `;
    }

    ctx.root.appendChild(page);
    ensureInlineStylesLoaded(layout?.inlineStyles || "");
    hydrateDetailsPage(runtimeCtx, page);

    try {
      window.setTimeout(() => hydrateDetailsPage(runtimeCtx, page), 220);
      window.setTimeout(() => hydrateDetailsPage(runtimeCtx, page), 760);
    } catch (_e) {}

    return {
      unmount() {
        try { page.remove(); } catch (_e) {}
      }
    };
  }

  window[key] = { mountDetails };
})();

