(() => {
  const key = "__DOKE_V2_PAGE_NATIVE_BRIDGE__";
  if (window[key]) return;

  const layoutCache = new Map();

  function normalizeFile(path) {
    return String(path || "").toLowerCase().split("/").pop() || "index.html";
  }

  function slugify(file) {
    return normalizeFile(file).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }

  function fixMojibake(text) {
    const value = String(text || "");
    try {
      return decodeURIComponent(escape(value));
    } catch (_e) {
      return value;
    }
  }

  function pickContentRoot(doc) {
    return doc.querySelector("main")
      || doc.querySelector(".dp-wrap")
      || doc.querySelector(".container-principal")
      || doc.querySelector(".container")
      || doc.body;
  }

  function sanitizeContent(root) {
    const clone = root.cloneNode(true);
    const selectorsToRemove = [
      "header",
      "footer.main-footer",
      ".bottom-nav",
      ".sidebar-icones",
      ".sidebar-desktop",
      ".navbar-mobile",
      ".navbar-desktop",
      "#overlay-menu",
      "#popup",
      "#dokeToast",
      ".doke-fabs",
      "script"
    ];
    selectorsToRemove.forEach((sel) => {
      clone.querySelectorAll(sel).forEach((node) => node.remove());
    });
    if (clone.matches && selectorsToRemove.some((sel) => clone.matches(sel))) {
      return document.createElement("div");
    }
    return clone;
  }

  async function fetchLayout(file) {
    if (layoutCache.has(file)) return layoutCache.get(file);
    let layout = {
      file,
      title: file,
      html: "",
      footerHtml: "",
      inlineStyles: "",
      linkedStyles: [],
      linkedScripts: [],
      inlineScripts: []
    };
    try {
      const res = await fetch(file, { credentials: "same-origin" });
      const htmlRaw = await res.text();
      const html = fixMojibake(htmlRaw);
      const doc = new DOMParser().parseFromString(html, "text/html");
      const contentRoot = pickContentRoot(doc);
      const sanitized = sanitizeContent(contentRoot);
      const footer = doc.querySelector("footer.main-footer, footer");
      layout = {
        file,
        title: String(doc.title || file).trim(),
        html: sanitized.innerHTML || sanitized.outerHTML || "",
        footerHtml: footer ? footer.outerHTML : "",
        inlineStyles: Array.from(doc.querySelectorAll("head style")).map((el) => String(el.textContent || "")).join("\n\n"),
        linkedStyles: Array.from(doc.querySelectorAll('head link[rel="stylesheet"][href]'))
          .map((el) => String(el.getAttribute("href") || "").trim())
          .filter(Boolean)
          .filter((href) => !/app-v2\/styles\.css|app-v2\/app-main\.js/i.test(href)),
        linkedScripts: Array.from(doc.querySelectorAll('script[src]'))
          .map((el) => String(el.getAttribute("src") || "").trim())
          .filter(Boolean)
          .filter((src) => !/app-v2\//i.test(src))
          .filter((src) => !/(^|\/)(doke-shell|doke-nav-boot|auth-guard)\.js/i.test(src)),
        inlineScripts: Array.from(doc.querySelectorAll("script:not([src])"))
          .map((el) => String(el.textContent || "").trim())
          .filter(Boolean)
      };
    } catch (_e) {}
    layoutCache.set(file, layout);
    return layout;
  }

  function ensureInlineStyles(file, cssText) {
    const text = String(cssText || "").trim();
    if (!text) return;
    const id = `doke-v2-bridge-style-${slugify(file)}`;
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

  function ensureLinkedStyles(hrefs) {
    (hrefs || []).forEach((href) => {
      const normalized = href.split("?")[0];
      const exists = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).some((el) => String(el.getAttribute("href") || "").split("?")[0] === normalized);
      if (exists) return;
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.setAttribute("data-doke-v2-bridge", "1");
      document.head.appendChild(link);
    });
  }

  async function executeScriptText(source, label) {
    const code = String(source || "").trim();
    if (!code) return;
    const lower = code.toLowerCase();
    if (lower.includes('<script') || lower.includes('firebaseconfig')) return;
    if (/^\s*(<|<!doctype|html\b|body\b|head\b)/i.test(code)) return;
    if (/\b(?:const|let|var)\s+firebaseConfig\b/i.test(code)) return;
    const originalAdd = document.addEventListener.bind(document);
    document.addEventListener = function(type, listener, options) {
      if (type === "DOMContentLoaded" && typeof listener === "function") {
        try { listener.call(document, new Event("DOMContentLoaded")); } catch (_e) {}
        return;
      }
      return originalAdd(type, listener, options);
    };
    try {
      const script = document.createElement("script");
      script.text = `${code}\n//# sourceURL=${label}`;
      document.body.appendChild(script);
      script.remove();
    } catch (_e) {}
    document.addEventListener = originalAdd;
  }

  async function executeLinkedScripts(srcs, file) {
    for (const src of (srcs || [])) {
      try {
        const abs = new URL(src, location.href).toString();
        const response = await fetch(abs, { credentials: "same-origin" });
        const text = await response.text();
        await executeScriptText(text, `${file}::${src}`);
      } catch (_e) {}
    }
  }

  function buildFallbackCard(file) {
    const card = document.createElement("div");
    card.className = "doke-v2-card doke-v2-bridge-empty";
    card.innerHTML = `
      <h1>${file.replace(/\.html$/i, "")}</h1>
      <p>Esta rota já foi tirada do fluxo <strong>legacy-html</strong>, mas ainda precisa de uma portabilidade mais profunda do comportamento antigo.</p>
    `;
    return card;
  }

  function normalizeHero(page) {
    const hero = page.querySelector('.hero, .hero-section, .hero-negocios, .page-hero, .perfil-hero, .cover, .topo-pagina');
    if (hero instanceof HTMLElement) hero.classList.add('doke-v2-hero');
  }

  function isProfileRoute(file) {
    const normalized = normalizeFile(file);
    return [
      "meuperfil.html",
      "perfil-profissional.html",
      "perfil.html",
      "perfil-cliente.html",
      "perfil-usuario.html",
      "perfil-empresa.html"
    ].includes(normalized);
  }

  function buildProfileFrameSrc(file) {
    const url = new URL(file, location.href);
    const current = new URLSearchParams(location.search || "");
    current.forEach((value, key) => {
      if (String(key || "").toLowerCase() === "appv2") return;
      url.searchParams.set(key, value);
    });
    url.searchParams.set("v2frame", "1");
    url.searchParams.set("noshell", "1");
    url.searchParams.set("embed", "1");
    return url.toString();
  }

  function mountProfileFrame(page, shell, file) {
    const wrap = document.createElement("div");
    wrap.className = "doke-v2-bridge-frame-wrap";
    const frame = document.createElement("iframe");
    frame.className = "doke-v2-bridge-frame";
    frame.loading = "eager";
    frame.referrerPolicy = "same-origin";
    frame.setAttribute("title", file.replace(/\.html$/i, ""));
    frame.setAttribute("scrolling", "no");
    frame.src = buildProfileFrameSrc(file);
    wrap.appendChild(frame);
    shell.appendChild(wrap);

    let syncTimer = 0;
    let ro = null;
    let readyPoll = 0;
    let revealTimer = 0;
    let revealed = false;
    const syncHeight = () => {
      try {
        const doc = frame.contentDocument;
        const body = doc?.body;
        const html = doc?.documentElement;
        const next = Math.max(
          body?.scrollHeight || 0,
          body?.offsetHeight || 0,
          html?.scrollHeight || 0,
          html?.offsetHeight || 0,
          640
        );
        frame.style.height = `${next}px`;
      } catch (_e) {}
    };
    const reveal = () => {
      if (revealed) return;
      revealed = true;
      wrap.classList.add("is-ready");
      try { clearInterval(readyPoll); } catch (_e) {}
      try { clearTimeout(revealTimer); } catch (_e) {}
      syncHeight();
    };
    const isProfileReady = () => {
      try {
        const doc = frame.contentDocument;
        const root = doc?.querySelector("#dpRoot");
        const name = doc?.querySelector("#dpName");
        const cover = doc?.querySelector("#dpCover");
        const rootReady = !!root && !root.classList.contains("dp-loading");
        const hasName = !!String(name?.textContent || "").trim();
        const coverStyle = String(cover?.style?.backgroundImage || "").trim();
        const coverReady = coverStyle.includes("url(") || coverStyle === "none";
        return rootReady && hasName && coverReady;
      } catch (_e) {
        return false;
      }
    };
    frame.addEventListener("load", () => {
      syncHeight();
      clearInterval(syncTimer);
      syncTimer = window.setInterval(syncHeight, 400);
      window.setTimeout(() => {
        clearInterval(syncTimer);
        syncTimer = 0;
      }, 12000);
      try {
        const doc = frame.contentDocument;
        const body = doc?.body;
        if (body && "ResizeObserver" in window) {
          ro = new ResizeObserver(() => syncHeight());
          ro.observe(body);
        }
      } catch (_e) {}
      clearInterval(readyPoll);
      readyPoll = window.setInterval(() => {
        syncHeight();
        if (isProfileReady()) reveal();
      }, 160);
      reveal();
      revealTimer = window.setTimeout(() => reveal(), 600);
    });

    return {
      unmount() {
        try { clearInterval(syncTimer); } catch (_e) {}
        try { clearInterval(readyPoll); } catch (_e) {}
        try { clearTimeout(revealTimer); } catch (_e) {}
        try { ro?.disconnect(); } catch (_e) {}
        try { frame.src = "about:blank"; } catch (_e) {}
        try { page.remove(); } catch (_e) {}
      }
    };
  }

  async function mountNativeBridge(ctx) {
    const file = normalizeFile(ctx?.path || "");
    const slug = slugify(file);
    const page = document.createElement("section");
    page.className = `doke-v2-page doke-v2-page-bridge doke-v2-page-bridge-${slug}`;
    if (isProfileRoute(file)) page.classList.add("doke-v2-page-bridge-profile");
    page.innerHTML = `
      <div class="doke-v2-bridge-shell">
        <div class="doke-v2-bridge-loading">
          <div class="doke-v2-skeleton-line is-title"></div>
          <div class="doke-v2-skeleton-block is-hero"></div>
          <div class="doke-v2-skeleton-grid">
            <div class="doke-v2-skeleton-block"></div>
            <div class="doke-v2-skeleton-block"></div>
            <div class="doke-v2-skeleton-block"></div>
          </div>
        </div>
      </div>
    `;
    ctx.root.appendChild(page);

    const layout = await fetchLayout(file);
    ensureInlineStyles(file, layout.inlineStyles);
    ensureLinkedStyles(layout.linkedStyles);

    const shell = page.querySelector('.doke-v2-bridge-shell');
    if (!(shell instanceof HTMLElement)) return { unmount() { try { page.remove(); } catch (_e) {} } };
    shell.innerHTML = "";

    if (isProfileRoute(file)) {
      try { document.body.setAttribute("data-page", "perfil"); } catch (_e) {}
      try { window.dispatchEvent(new Event("resize")); } catch (_e) {}
      return mountProfileFrame(page, shell, file);
    }

    if (layout.html) {
      const surface = document.createElement("div");
      surface.className = "doke-v2-bridge-surface";
      const head = document.createElement("div");
      head.className = "doke-v2-bridge-head doke-v2-hero doke-v2-page-hero";
      head.innerHTML = `
        <div>
          <span class="doke-v2-eyebrow">Migração em lote</span>
          <h1>${layout.title || file}</h1>
          <p>Conteúdo legado reaproveitado dentro da shell nativa do app-v2.</p>
        </div>
      `;
      const content = document.createElement("div");
      content.className = "doke-v2-bridge-content";
      content.innerHTML = layout.html;
      if (!isProfileRoute(file)) surface.appendChild(head);
      surface.appendChild(content);
      if (layout.footerHtml) {
        const footerWrap = document.createElement("div");
        footerWrap.className = "doke-v2-bridge-footer";
        footerWrap.innerHTML = layout.footerHtml;
        surface.appendChild(footerWrap);
      }
      shell.appendChild(surface);
      normalizeHero(page);
      await executeLinkedScripts(layout.linkedScripts, file);
      for (const inlineScript of layout.inlineScripts) {
        await executeScriptText(inlineScript, `${file}::inline`);
      }
    } else {
      shell.appendChild(buildFallbackCard(file));
    }

    try { document.body.setAttribute("data-page", slug.replace(/-html$/, "")); } catch (_e) {}
    try { window.dispatchEvent(new Event("resize")); } catch (_e) {}

    return {
      unmount() {
        try { page.remove(); } catch (_e) {}
      }
    };
  }

  window[key] = {
    mountNativeBridge,
    normalizeFile,
    slugify,
    getLayout: fetchLayout,
    ensureInlineStyles,
    ensureLinkedStyles,
    executeLinkedScripts,
    executeInlineScripts: async (scripts, file) => {
      for (const inlineScript of (scripts || [])) {
        await executeScriptText(inlineScript, `${file}::inline`);
      }
    }
  };
})();
