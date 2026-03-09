(function(){
  const ENABLE_KEY = "doke_app_v2";
const VERSION = "20260309v65";
  const clearPreboot = () => {
    try { document.documentElement.classList.remove("doke-v2-preboot"); } catch (_e) {}
  };
  const qp = new URLSearchParams(location.search || "");
  const currentFile = String((location.pathname || "").split("/").pop() || "index.html").toLowerCase();
  const forcedOff = qp.get("appv2") === "0";
  const enabled = !forcedOff && (qp.get("appv2") === "1" || localStorage.getItem(ENABLE_KEY) === "1" || currentFile === "index.html");
  const isFrameMode = qp.get("v2frame") === "1" || qp.get("embed") === "1" || qp.get("noshell") === "1";
  if (isFrameMode) { clearPreboot(); return; }
  if (!enabled) { clearPreboot(); return; }
  try {
    localStorage.setItem(ENABLE_KEY, "1");
  } catch (_e) {}
  if (window.__DOKE_APP_V2_BOOTED__) { clearPreboot(); return; }
  window.__DOKE_APP_V2_BOOTED__ = true;

  function addCss(href){
    return new Promise((resolve) => {
      const existing = Array.from(document.querySelectorAll("link[rel='stylesheet']")).find(
        (l) => String(l.getAttribute("href") || "").includes(String(href).split("?")[0])
      );
      if (existing) {
        resolve();
        return;
      }
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.onload = () => resolve();
      link.onerror = () => resolve();
      document.head.appendChild(link);
    });
  }

  function addScript(src){
    return new Promise((resolve) => {
      const s = document.createElement("script");
      s.src = src;
      s.async = false;
      s.onload = () => resolve();
      s.onerror = () => resolve();
      document.head.appendChild(s);
    });
  }

  function normalizeLegacyViewportState() {
    try {
      const html = document.documentElement;
      const body = document.body;
      if (!(html instanceof HTMLElement) || !(body instanceof HTMLElement)) return;

      const lockedClasses = [
        "no-scroll",
        "doke-modal-open",
        "doke-search-open",
        "doke-drawer-open",
        "doke-menu-open",
        "doke-sidebar-search-open",
        "menu-ativo",
        "chat-keyboard-open",
        "doke-nav-pending",
        "doke-shell-active",
        "doke-shell-no-padding",
        "doke-no-main"
      ];
      lockedClasses.forEach((cls) => {
        html.classList.remove(cls);
        body.classList.remove(cls);
      });

      const clearLayoutStyles = (el) => {
        if (!(el instanceof HTMLElement)) return;
        [
          "overflow",
          "overflowY",
          "position",
          "top",
          "left",
          "right",
          "width",
          "height"
        ].forEach((prop) => {
          try { el.style[prop] = ""; } catch (_e) {}
        });
      };
      clearLayoutStyles(html);
      clearLayoutStyles(body);

      const overlayMenu = document.getElementById("overlay-menu");
      if (overlayMenu instanceof HTMLElement) overlayMenu.style.display = "none";
      const sidebar = document.querySelector(".sidebar-icones");
      if (sidebar instanceof HTMLElement) sidebar.classList.remove("menu-aberto", "ig-search-open");

      if (typeof window.updateScrollLock === "function") {
        try { window.updateScrollLock(); } catch (_e) {}
      }
    } catch (_e) {}
  }

  function markLegacyShellClasses(body) {
    if (!(body instanceof HTMLElement)) return;
    const hasLegacyDesktopHeader = !!body.querySelector("header.navbar-desktop");
    const hasLegacyMobileHeader = !!body.querySelector("header.navbar-mobile");
    const hasLegacyHeader = hasLegacyDesktopHeader || hasLegacyMobileHeader;
    const hasLegacyBottomNav = !!body.querySelector(".bottom-nav");
    body.classList.toggle("doke-v2-has-legacy-header", hasLegacyHeader);
    body.classList.toggle("doke-v2-has-legacy-header-desktop", hasLegacyDesktopHeader);
    body.classList.toggle("doke-v2-has-legacy-header-mobile", hasLegacyMobileHeader);
    body.classList.toggle("doke-v2-has-legacy-bottom-nav", hasLegacyBottomNav);
  }

  function normalizeRouteFile(pathname) {
    const file = String(pathname || "").toLowerCase().split("/").pop() || "index.html";
    return file;
  }

  function syncLegacyNav(pathname) {
    try {
      const file = normalizeRouteFile(pathname);
      const body = document.body;
      if (!(body instanceof HTMLElement)) return;

      body.querySelectorAll(".bottom-nav .item").forEach((el) => {
        const link = el instanceof HTMLAnchorElement ? el : el.querySelector("a[href]");
        const href = String(link?.getAttribute("href") || "").toLowerCase().split("?")[0];
        const active = !!href && href.endsWith(file);
        el.classList.toggle("active", active);
        if (active) el.setAttribute("aria-current", "page");
        else el.removeAttribute("aria-current");
      });

      body.querySelectorAll("header.navbar-desktop .menu a").forEach((a) => {
        const href = String(a.getAttribute("href") || "").toLowerCase().split("?")[0];
        const active = !!href && href.endsWith(file);
        a.classList.toggle("active", active);
        if (active) a.setAttribute("aria-current", "page");
        else a.removeAttribute("aria-current");
      });
    } catch (_e) {}
  }

  async function boot(){
    await addCss(`app-v2/styles.css?v=${VERSION}`);
    await addScript(`app-v2/core/state.js?v=${VERSION}`);
    await addScript(`app-v2/core/router.js?v=${VERSION}`);
    await addScript(`app-v2/core/shell.js?v=${VERSION}`);
    await addScript(`app-v2/pages/home.js?v=${VERSION}`);
    await addScript(`app-v2/pages/search.js?v=${VERSION}`);
    await addScript(`app-v2/pages/details.js?v=${VERSION}`);
    await addScript(`app-v2/pages/legacy-html.js?v=${VERSION}`);
    await addScript(`app-v2/pages/placeholder.js?v=${VERSION}`);

    const shellApi = window.__DOKE_V2_SHELL__;
    const routerApi = window.__DOKE_V2_ROUTER__;
    const homeApi = window.__DOKE_V2_PAGE_HOME__;
    const searchApi = window.__DOKE_V2_PAGE_SEARCH__;
    const detailsApi = window.__DOKE_V2_PAGE_DETAILS__;
    const legacyHtmlApi = window.__DOKE_V2_PAGE_LEGACY_HTML__;
    const placeholderApi = window.__DOKE_V2_PAGE_PLACEHOLDER__;
    if (!shellApi || !routerApi || !homeApi || !searchApi || !detailsApi || !legacyHtmlApi || !placeholderApi) {
      clearPreboot();
      return;
    }

    normalizeLegacyViewportState();

    const homeMain = document.querySelector("main.dp-wrap") || document.querySelector("main");
    const homeFooter = document.querySelector("footer.main-footer");
    const homeMainHtml = homeMain instanceof HTMLElement ? homeMain.outerHTML : "";
    const homeFooterHtml = homeFooter instanceof HTMLElement ? homeFooter.outerHTML : "";
    const preserveSelectors = [
      "a.skip-link",
      "header.navbar-desktop",
      "header.navbar-mobile",
      "#popup",
      "#overlay-menu",
      "#dokeToast",
      ".doke-fabs",
      ".bottom-nav",
      "#modalPlayerVideo",
      "#modalGaleria",
      "#modalSolicitacao",
      "#modalStoryViewer",
      "#dokeAlertModal",
      "#dokeConfirmModal",
      "#dokePromptModal"
    ];
    const preservedNodes = [];
    preserveSelectors.forEach((sel) => {
      const node = document.querySelector(sel);
      if (!(node instanceof HTMLElement)) return;
      if (node === homeMain) return;
      if (preservedNodes.includes(node)) return;
      preservedNodes.push(node);
    });
    window.__DOKE_V2_LEGACY__ = {
      homeMainHtml,
      homeFooterHtml,
      preservedNodes
    };

    const shell = shellApi.createShell();
    document.body.innerHTML = "";
    document.documentElement.classList.add("doke-v2-active");
    document.body.classList.add("doke-v2-active");
    document.body.appendChild(shell.root);
    preservedNodes.forEach((node) => {
      try { document.body.appendChild(node); } catch (_e) {}
    });
    markLegacyShellClasses(document.body);
    normalizeLegacyViewportState();
    syncLegacyNav("index.html");

    const router = routerApi.createRouter({
      root: shell.main,
      onAfterNavigate(path) {
        normalizeLegacyViewportState();
        markLegacyShellClasses(document.body);
        if (shell && typeof shell.setActive === "function") shell.setActive(path);
        syncLegacyNav(path);
        const file = String(path || "").toLowerCase();
        if (file === "index.html") document.body.setAttribute("data-page", "home");
        else if (file === "busca.html") document.body.setAttribute("data-page", "busca");
        else if (file === "detalhes.html") document.body.setAttribute("data-page", "detalhes");
        else if (file === "pedidos.html") document.body.setAttribute("data-page", "pedidos");
        else if (file === "mensagens.html") document.body.setAttribute("data-page", "chat");
        else document.body.setAttribute("data-page", "v2");
      }
    });
    router.register("index.html", homeApi.mountHome);
    router.register("busca.html", searchApi.mountSearch);
    router.register("detalhes.html", detailsApi.mountDetails);
    [
      "negocios.html",
      "notificacoes.html",
      "comunidade.html",
      "novidades.html",
      "escolheranuncio.html",
      "pedidos.html",
      "mensagens.html",
      "meuperfil.html",
      "mais.html"
    ].forEach((route) => router.register(route, legacyHtmlApi.mountLegacyHtml));
    [
      "carteira.html"
    ].forEach((route) => router.register(route, placeholderApi.mountPlaceholder));
    window.__DOKE_V2_NAVIGATE__ = async (to) => {
      try {
        await router.navigate(String(to || "index.html"));
      } catch (_e) {}
    };
    const qsNow = new URLSearchParams(location.search || "");
    const routeRaw = String(qsNow.get("route") || "").trim();
    const fromLegacyRoute = qsNow.get("fromLegacyRoute") === "1";
    const currentFile = normalizeRouteFile(location.pathname);
    const canUseRouteParam = currentFile === "index.html" && fromLegacyRoute && !!routeRaw;
    const initialRoute = canUseRouteParam ? routeRaw.split("#")[0] : `${location.pathname}${location.search || ""}`;
    router.start(initialRoute).finally(() => {
      clearPreboot();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
