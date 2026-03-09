(() => {
  const key = "__DOKE_V2_PAGE_LEGACY_HTML__";
  if (window[key]) return;

  const cache = new Map();

  function fixMojibake(text) {
    const value = String(text || "");
    try {
      return decodeURIComponent(escape(value));
    } catch (_e) {
      return value;
    }
  }

  function normalizeFile(path) {
    return String(path || "").toLowerCase().split("/").pop() || "index.html";
  }

  function slugify(file) {
    return normalizeFile(file).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }

  async function loadRouteLayout(path) {
    const file = normalizeFile(path);
    if (cache.has(file)) return cache.get(file);
    let result = {
      file,
      mainHtml: "",
      footerHtml: "",
      inlineStyles: ""
    };
    try {
      const res = await fetch(file, { credentials: "same-origin" });
      const htmlRaw = await res.text();
      const html = fixMojibake(htmlRaw);
      const doc = new DOMParser().parseFromString(html, "text/html");
      const main = doc.querySelector("main");
      const footer = doc.querySelector("footer.main-footer, footer");
      const inlineStyles = Array.from(doc.querySelectorAll("head style"))
        .map((styleEl) => String(styleEl.textContent || ""))
        .join("\n\n");
      result = {
        file,
        mainHtml: main ? main.outerHTML : "",
        footerHtml: footer ? footer.outerHTML : "",
        inlineStyles
      };
    } catch (_e) {}
    cache.set(file, result);
    return result;
  }

  function ensureInlineStyles(file, cssText) {
    const text = String(cssText || "").trim();
    if (!text) return;
    const id = `doke-v2-legacy-inline-${slugify(file)}`;
    let style = document.getElementById(id);
    if (!(style instanceof HTMLStyleElement)) {
      style = document.createElement("style");
      style.id = id;
      document.head.appendChild(style);
    }
    if (String(style.textContent || "").trim() !== text) {
      style.textContent = text;
    }
  }

  async function mountLegacyHtml(ctx) {
    const route = normalizeFile(ctx?.path || "");
    const page = document.createElement("section");
    page.className = `doke-v2-page doke-v2-page-legacy doke-v2-page-legacy-${slugify(route)}`;

    const layout = await loadRouteLayout(route);
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
      ensureInlineStyles(route, layout.inlineStyles);
    } else {
      page.innerHTML = `
        <div class="doke-v2-card">
          <h1>Página em migração</h1>
          <p><strong>${route}</strong> ainda não pôde ser portada automaticamente.</p>
        </div>
      `;
    }

    ctx.root.appendChild(page);
    try { window.dispatchEvent(new Event("resize")); } catch (_e) {}
    try {
      const pageMap = {
        "pedidos.html": "pedidos",
        "mensagens.html": "chat",
        "notificacoes.html": "notificacoes",
        "comunidade.html": "comunidade",
        "negocios.html": "negocios",
        "meuperfil.html": "perfil",
        "novidades.html": "novidades",
        "mais.html": "mais",
        "escolheranuncio.html": "anunciar"
      };
      document.body.setAttribute("data-page", pageMap[route] || "v2");
    } catch (_e) {}

    return {
      unmount() {
        try { page.remove(); } catch (_e) {}
      }
    };
  }

  window[key] = { mountLegacyHtml };
})();
