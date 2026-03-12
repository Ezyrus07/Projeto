(function(){
  const ENABLE_KEY = "doke_app_v2";
const VERSION = "20260311v04";
  const clearPreboot = () => {
    try { document.documentElement.classList.remove("doke-v2-preboot"); } catch (_e) {}
  };
  const qp = new URLSearchParams(location.search || "");
  const currentFile = String((location.pathname || "").split("/").pop() || "index.html").toLowerCase();
  const requestedRoute = String((qp.get("route") || currentFile || "index.html")).toLowerCase().split("?")[0].split("/").pop();
  const forcedOff = qp.get("appv2") === "0";
  const enabled = !forcedOff && (qp.get("appv2") === "1" || localStorage.getItem(ENABLE_KEY) === "1" || currentFile === "index.html");
  const disabledLegacyRoutes = new Set(["login.html","cadastro.html"]);
  function readJson(raw) {
    try {
      if (!raw) return null;
      let parsed = raw;
      for (let i = 0; i < 2; i += 1) {
        if (typeof parsed !== "string") break;
        parsed = parsed ? JSON.parse(parsed) : null;
      }
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch (_e) {
      return null;
    }
  }
  function decodeJwtPayload(token) {
    try {
      const parts = String(token || "").split(".");
      if (parts.length < 2) return null;
      const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const pad = "=".repeat((4 - (b64.length % 4)) % 4);
      return JSON.parse(atob(b64 + pad));
    } catch (_e) {
      return null;
    }
  }
  function normalizeExpMs(rawExp) {
    const value = Number(rawExp || 0);
    if (!Number.isFinite(value) || value <= 0) return 0;
    return value > 1000000000000 ? value : value * 1000;
  }
  function buildStoredSessionCandidate(source) {
    if (!source || typeof source !== "object") return null;
    const sessions = [source, source.currentSession, source.session, source.data && source.data.session];
    for (let i = 0; i < sessions.length; i += 1) {
      const session = sessions[i];
      if (!session || typeof session !== "object") continue;
      const access = String(session.access_token || "").trim();
      if (!access) continue;
      const payload = decodeJwtPayload(access);
      const expiresAtMs = normalizeExpMs(session.expires_at || session.expiresAt || (payload && payload.exp));
      if (expiresAtMs && expiresAtMs <= (Date.now() + 10000)) continue;
      const uid = String((session.user && (session.user.id || session.user.uid)) || (payload && payload.sub) || "").trim();
      return { access_token: access, uid };
    }
    return null;
  }
  function readSessionFromCookie(cookieName) {
    try {
      const needle = `${String(cookieName || "").trim()}=`;
      const parts = String(document.cookie || "").split(";");
      for (let i = 0; i < parts.length; i += 1) {
        const item = String(parts[i] || "").trim();
        if (!item.startsWith(needle)) continue;
        const parsed = buildStoredSessionCandidate(readJson(decodeURIComponent(item.slice(needle.length))));
        if (parsed) return parsed;
      }
    } catch (_e) {}
    return null;
  }
  function getStoredSessionCandidate() {
    try {
      const keys = Object.keys(localStorage || {});
      for (let i = 0; i < keys.length; i += 1) {
        const key = String(keys[i] || "");
        if (!/^sb-[a-z0-9-]+-auth-token$/i.test(key)) continue;
        const parsed = buildStoredSessionCandidate(readJson(localStorage.getItem(key) || ""));
        if (parsed) return parsed;
      }
    } catch (_e) {}
    const backup = buildStoredSessionCandidate(readJson(localStorage.getItem("doke_auth_session_backup") || ""));
    if (backup) return backup;
    return readSessionFromCookie("doke_dev_session");
  }
  function hasWeakTrustedMarkers() {
    try {
      const verifiedAt = Number(localStorage.getItem("doke_auth_verified_at") || sessionStorage.getItem("doke_auth_verified_at") || 0);
      if (!Number.isFinite(verifiedAt) || verifiedAt <= 0 || (Date.now() - verifiedAt) > 1000 * 60 * 60 * 24 * 14) return false;
      const uid = String(localStorage.getItem("doke_uid") || "").trim();
      if (!uid) return false;
      const flag = String(localStorage.getItem("usuarioLogado") || "").toLowerCase();
      return (flag === "true" || flag === "1");
    } catch (_e) {
      return false;
    }
  }
  function hasLocalAuthGuard() {
    try {
      const logoutAt = Number(localStorage.getItem("doke_force_logged_out_at") || sessionStorage.getItem("doke_force_logged_out_at") || 0);
      if (Number.isFinite(logoutAt) && logoutAt > 0 && (Date.now() - logoutAt) < 1000 * 60 * 60 * 24 * 7) return false;
      const stored = getStoredSessionCandidate();
      if (stored?.access_token) {
        if (stored.uid) localStorage.setItem("doke_uid", stored.uid);
        localStorage.setItem("usuarioLogado", "true");
        return true;
      }
      const raw = localStorage.getItem("doke_usuario_perfil") || localStorage.getItem("perfil_usuario") || "";
      const parsed = raw ? JSON.parse(raw) : null;
      const uid = String(parsed?.uid || parsed?.id || localStorage.getItem("doke_uid") || window.auth?.currentUser?.uid || "").trim();
      const flag = ["usuarioLogado","logado","isLoggedIn","doke_logged_in"].some((key) => String(localStorage.getItem(key) || "").toLowerCase() === "true");
      const backup = String(localStorage.getItem("doke_auth_session_backup") || "").trim();
      const tokenKey = Object.keys(localStorage || {}).find((key) => /^sb-[a-z0-9-]+-auth-token$/i.test(String(key || "")));
      let hasSbToken = false;
      if (tokenKey) { try { const raw=localStorage.getItem(tokenKey)||''; const obj=raw?JSON.parse(raw):null; const expiresAt=Number(obj?.expires_at || obj?.expiresAt || obj?.currentSession?.expires_at || 0); const access=String(obj?.access_token || obj?.currentSession?.access_token || '').trim(); hasSbToken=!!(access && (!expiresAt || expiresAt*1000 > Date.now())); } catch(_e) {} }
      const hasCookie = String(document.cookie || "").includes("doke_dev_session=");
      const hasSession = !!(window.auth?.currentUser?.uid || backup || hasSbToken || hasCookie);
      return !!(uid && flag && hasSession) || hasWeakTrustedMarkers();
    } catch (_e) { return false; }
  }

  const isFrameMode = qp.get("v2frame") === "1" || qp.get("embed") === "1" || qp.get("noshell") === "1";
  if (isFrameMode) { clearPreboot(); return; }
  if (disabledLegacyRoutes.has(currentFile)) { clearPreboot(); return; }
  const protectedDirectRoutes = new Set(["mensagens.html","notificacoes.html","pedidos.html","meuperfil.html","perfil-profissional.html","perfil.html","perfil-cliente.html","perfil-usuario.html","perfil-empresa.html","tornar-profissional.html"]);
  const protectedTarget = protectedDirectRoutes.has(requestedRoute) ? requestedRoute : (protectedDirectRoutes.has(currentFile) ? currentFile : "");
  if (protectedTarget && !hasLocalAuthGuard()) {
    const nextPath = protectedTarget + (currentFile === "index.html" && qp.get("route") ? "" : (location.search || "")) + (location.hash || "");
    location.replace(`login.html?next=${encodeURIComponent(nextPath)}`);
    return;
  }
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
    await addScript(`app-v2/pages/notifications.js?v=${VERSION}`);
    await addScript(`app-v2/pages/orders.js?v=${VERSION}`);
    await addScript(`app-v2/pages/messages.js?v=${VERSION}`);
    await addScript(`app-v2/pages/more.js?v=${VERSION}`);
    await addScript(`app-v2/pages/news.js?v=${VERSION}`);
    await addScript(`app-v2/pages/ad-choice.js?v=${VERSION}`);
    await addScript(`app-v2/pages/help.js?v=${VERSION}`);
    await addScript(`app-v2/pages/wallet.js?v=${VERSION}`);
    await addScript(`app-v2/pages/history.js?v=${VERSION}`);
    await addScript(`app-v2/pages/settings-pages.js?v=${VERSION}`);
    await addScript(`app-v2/pages/native-bridge.js?v=${VERSION}`);
    await addScript(`app-v2/pages/social-pages.js?v=${VERSION}`);
    await addScript(`app-v2/pages/transaction-pages.js?v=${VERSION}`);
    await addScript(`app-v2/pages/campaign-pages.js?v=${VERSION}`);
    await addScript(`app-v2/pages/utility-pages.js?v=${VERSION}`);
    await addScript(`app-v2/pages/legacy-html.js?v=${VERSION}`);
    await addScript(`app-v2/pages/placeholder.js?v=${VERSION}`);

    const shellApi = window.__DOKE_V2_SHELL__;
    const routerApi = window.__DOKE_V2_ROUTER__;
    const homeApi = window.__DOKE_V2_PAGE_HOME__;
    const placeholderApi = window.__DOKE_V2_PAGE_PLACEHOLDER__ || { mountPlaceholder(root){ if(root){ root.innerHTML = '<section class="doke-page doke-page--placeholder"><div class="card"><h1>Doke</h1><p>Esta área está sendo preparada.</p></div></section>'; } } };
    const fallbackMount = (label) => (root) => placeholderApi.mountPlaceholder(root, { title: label || 'Doke' });
    const fallbackApi = (map) => Object.assign({}, map);
    const searchApi = window.__DOKE_V2_PAGE_SEARCH__ || fallbackApi({ mountSearch: fallbackMount('Busca') });
    const detailsApi = window.__DOKE_V2_PAGE_DETAILS__ || fallbackApi({ mountDetails: fallbackMount('Detalhes') });
    const notificationsApi = window.__DOKE_V2_PAGE_NOTIFICATIONS__ || fallbackApi({ mountNotifications: fallbackMount('Notificações') });
    const ordersApi = window.__DOKE_V2_PAGE_ORDERS__ || fallbackApi({ mountOrders: fallbackMount('Pedidos') });
    const messagesApi = window.__DOKE_V2_PAGE_MESSAGES__ || fallbackApi({ mountMessages: fallbackMount('Mensagens') });
    const moreApi = window.__DOKE_V2_PAGE_MORE__ || fallbackApi({ mountMore: fallbackMount('Mais') });
    const newsApi = window.__DOKE_V2_PAGE_NEWS__ || fallbackApi({ mountNews: fallbackMount('Novidades') });
    const adChoiceApi = window.__DOKE_V2_PAGE_AD_CHOICE__ || fallbackApi({ mountAdChoice: fallbackMount('Anunciar') });
    const helpApi = window.__DOKE_V2_PAGE_HELP__ || fallbackApi({ mountHelp: fallbackMount('Ajuda') });
    const walletApi = window.__DOKE_V2_PAGE_WALLET__ || fallbackApi({ mountWallet: fallbackMount('Carteira') });
    const historyApi = window.__DOKE_V2_PAGE_HISTORY__ || fallbackApi({ mountHistory: fallbackMount('Histórico') });
    const settingsPagesApi = window.__DOKE_V2_PAGE_SETTINGS_PAGES__ || fallbackApi({ mountPersonalData: fallbackMount('Dados pessoais'), mountAddresses: fallbackMount('Endereços'), mountNotificationPreferences: fallbackMount('Preferências'), mountLanguage: fallbackMount('Idioma'), mountPrivacy: fallbackMount('Privacidade'), mountSecurity: fallbackMount('Segurança'), mountPayments: fallbackMount('Pagamentos') });
    const nativeBridgeApi = window.__DOKE_V2_PAGE_NATIVE_BRIDGE__ || fallbackApi({ mountNativeBridge: fallbackMount('Página') });
    const socialPagesApi = window.__DOKE_V2_PAGE_SOCIAL__ || fallbackApi({ mountCommunity: fallbackMount('Comunidades'), mountGroup: fallbackMount('Grupo'), mountOwnProfile: fallbackMount('Perfil'), mountProfessionalProfile: fallbackMount('Perfil'), mountGenericProfile: fallbackMount('Perfil'), mountCompanyProfile: fallbackMount('Perfil'), mountFeed: fallbackMount('Feed'), mountPublications: fallbackMount('Publicações'), mountInteractions: fallbackMount('Interações') });
    const transactionalPagesApi = window.__DOKE_V2_PAGE_TRANSACTIONAL__ || fallbackApi({ mountBudget: fallbackMount('Orçamento'), mountPay: fallbackMount('Pagar'), mountOrderDetail: fallbackMount('Pedido'), mountProject: fallbackMount('Projeto'), mountResult: fallbackMount('Resultado') });
    const campaignPagesApi = window.__DOKE_V2_PAGE_CAMPAIGNS__ || fallbackApi({ mountCreateAd: fallbackMount('Anunciar'), mountCreateBusinessAd: fallbackMount('Anunciar negócio'), mountEditAd: fallbackMount('Editar anúncio'), mountReview: fallbackMount('Avaliar'), mountQuiz: fallbackMount('Quiz'), mountDiagnosis: fallbackMount('Diagnóstico'), mountAdvancedDiagnosis: fallbackMount('Diagnóstico'), mountBecomeProfessional: fallbackMount('Tornar-se profissional') });
    const utilityPagesApi = window.__DOKE_V2_PAGE_UTILITY__ || fallbackApi({ mountLogin: fallbackMount('Entrar'), mountSignup: fallbackMount('Criar conta'), mountExplore: fallbackMount('Explorar'), mountStats: fallbackMount('Estatísticas'), mountAdminValidation: fallbackMount('Admin') });
    const legacyHtmlApi = window.__DOKE_V2_PAGE_LEGACY_HTML__ || fallbackApi({ mountLegacyHtml: fallbackMount('Página') });
    if (!shellApi || !routerApi || !homeApi) {
      clearPreboot();
      document.documentElement.classList.remove('doke-v2-preboot');
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
        else if (file === "notificacoes.html") document.body.setAttribute("data-page", "notificacoes");
        else if (file === "mais.html") document.body.setAttribute("data-page", "mais");
        else if (file === "novidades.html") document.body.setAttribute("data-page", "novidades");
        else if (["escolheranuncio.html","anunciar.html","anunciar-negocio.html","editar-anuncio.html"].includes(file)) document.body.setAttribute("data-page", "escolheranuncio");
        else if (file === "tornar-profissional.html") document.body.setAttribute("data-page", "upgrade");
        else if (file === "ajuda.html") document.body.setAttribute("data-page", "ajuda");
        else if (file === "carteira.html") document.body.setAttribute("data-page", "carteira");
        else if (file === "historico.html") document.body.setAttribute("data-page", "historico");
        else if (["comunidade.html","grupo.html","meuperfil.html","perfil-profissional.html","perfil.html","perfil-cliente.html","perfil-usuario.html","perfil-empresa.html"].includes(file)) document.body.setAttribute("data-page", "perfil");
        else if (["feed.html","publicacoes.html","interacoes.html","videos-curtos.html"].includes(file)) document.body.setAttribute("data-page", "feed");
        else if (["orcamento.html","pagar.html","pedido.html","projeto.html","resultado.html"].includes(file)) document.body.setAttribute("data-page", "fluxo");
        else if (["login.html","cadastro.html"].includes(file)) document.body.setAttribute("data-page", "auth");
        else if (["explorar.html"].includes(file)) document.body.setAttribute("data-page", "explorar");
        else if (["estatistica.html"].includes(file)) document.body.setAttribute("data-page", "estatisticas");
        else if (["admin-validacoes.html"].includes(file)) document.body.setAttribute("data-page", "admin");
        else document.body.setAttribute("data-page", "v2");
      }
    });
    router.register("index.html", homeApi.mountHome);
    router.register("busca.html", searchApi.mountSearch);
    router.register("detalhes.html", detailsApi.mountDetails);
    router.register("notificacoes.html", notificationsApi.mountNotifications);
    router.register("pedidos.html", ordersApi.mountOrders);
    router.register("mensagens.html", messagesApi.mountMessages);
    router.register("mais.html", moreApi.mountMore);
    router.register("novidades.html", newsApi.mountNews);
    router.register("escolheranuncio.html", adChoiceApi.mountAdChoice);
    router.register("ajuda.html", helpApi.mountHelp);
    router.register("carteira.html", walletApi.mountWallet);
    router.register("historico.html", historyApi.mountHistory);
    router.register("dadospessoais.html", settingsPagesApi.mountPersonalData);
    router.register("enderecos.html", settingsPagesApi.mountAddresses);
    router.register("preferencia-notif.html", settingsPagesApi.mountNotificationPreferences);
    router.register("idioma.html", settingsPagesApi.mountLanguage);
    router.register("privacidade.html", settingsPagesApi.mountPrivacy);
    router.register("senha.html", settingsPagesApi.mountSecurity);
    router.register("pagamentos.html", settingsPagesApi.mountPayments);
    router.register("comunidade.html", socialPagesApi.mountCommunity);
    router.register("grupo.html", socialPagesApi.mountGroup);
    router.register("meuperfil.html", socialPagesApi.mountOwnProfile);
    router.register("perfil-profissional.html", socialPagesApi.mountProfessionalProfile);
    router.register("perfil.html", socialPagesApi.mountGenericProfile);
    router.register("perfil-cliente.html", socialPagesApi.mountGenericProfile);
    router.register("perfil-usuario.html", socialPagesApi.mountGenericProfile);
    router.register("perfil-empresa.html", socialPagesApi.mountCompanyProfile);
    router.register("feed.html", socialPagesApi.mountFeed);
    router.register("publicacoes.html", socialPagesApi.mountPublications);
    router.register("interacoes.html", socialPagesApi.mountInteractions);
    router.register("orcamento.html", transactionalPagesApi.mountBudget);
    router.register("pagar.html", transactionalPagesApi.mountPay);
    router.register("pedido.html", transactionalPagesApi.mountOrderDetail);
    router.register("projeto.html", transactionalPagesApi.mountProject);
    router.register("resultado.html", transactionalPagesApi.mountResult);
    router.register("anunciar.html", campaignPagesApi.mountCreateAd);
    router.register("anunciar-negocio.html", campaignPagesApi.mountCreateBusinessAd);
    router.register("editar-anuncio.html", campaignPagesApi.mountEditAd);
    router.register("avaliar.html", campaignPagesApi.mountReview);
    router.register("quiz.html", campaignPagesApi.mountQuiz);
    router.register("diagnostico.html", campaignPagesApi.mountDiagnosis);
    router.register("diagnostico-avancado.html", campaignPagesApi.mountAdvancedDiagnosis);
    router.register("tornar-profissional.html", campaignPagesApi.mountBecomeProfessional);
    router.register("login.html", utilityPagesApi.mountLogin);
    router.register("cadastro.html", utilityPagesApi.mountSignup);
    router.register("explorar.html", utilityPagesApi.mountExplore);
    router.register("estatistica.html", utilityPagesApi.mountStats);
    router.register("admin-validacoes.html", utilityPagesApi.mountAdminValidation);
    [
      "negocios.html",
      "acompanhamento-profissional.html",
      "empresas.html",
      "meuempreendimento.html",
      "negocio.html",
      "sobre-doke.html",
      "vergaleria.html",
      "videos-curtos.html"
    ].forEach((route) => router.register(route, nativeBridgeApi.mountNativeBridge));
    [
      "instrucoes-implementacao.html",
      "sadsad.html"
    ].forEach((route) => router.register(route, legacyHtmlApi.mountLegacyHtml));
    window.__DOKE_V2_NAVIGATE__ = async (to) => {
      try {
        const target = String(to || "index.html");
        const file = normalizeRouteFile(target);
        const protectedRoutes = new Set(["mensagens.html","notificacoes.html","pedidos.html","meuperfil.html","perfil-profissional.html","perfil.html","perfil-cliente.html","perfil-usuario.html","perfil-empresa.html","tornar-profissional.html"]);
        if (protectedRoutes.has(file) && !hasLocalAuthGuard()) {
          await router.navigate("login.html");
          return;
        }
        await router.navigate(target);
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
