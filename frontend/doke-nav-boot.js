(function () {
  const NAV_PREBOOT_KEY = "doke_nav_preboot_target_v1";
  const ENTER_CLASS = "doke-nav-enter";
  const READY_CLASS = "doke-nav-enter-ready";
  const currentPath = `${location.pathname || ""}${location.search || ""}`;
  const rawCurrentFileName = String((location.pathname || "").split("/").pop() || "").toLowerCase();
  const effectiveCurrentTarget = (() => {
    try {
      if (rawCurrentFileName !== "index.html" && rawCurrentFileName !== "") return `${rawCurrentFileName}${location.search || ""}`;
      const params = new URLSearchParams(location.search || "");
      if (params.get("fromLegacyRoute") !== "1") return `${rawCurrentFileName || "index.html"}${location.search || ""}`;
      const routeRaw = String(params.get("route") || "").trim();
      if (!routeRaw) return `${rawCurrentFileName || "index.html"}${location.search || ""}`;
      return routeRaw;
    } catch (_e) {
      return `${rawCurrentFileName || "index.html"}${location.search || ""}`;
    }
  })();
  const currentFileName = (() => {
    try {
      return String(effectiveCurrentTarget.split("?")[0] || "index.html").toLowerCase().split("/").pop() || rawCurrentFileName;
    } catch (_e) {
      return rawCurrentFileName;
    }
  })();
  const isHomePage = currentFileName === "" || currentFileName === "index.html";
  const migratedAppRoutes = new Set([
    "index.html",
    "busca.html",
    "detalhes.html",
    "notificacoes.html",
    "pedidos.html",
    "mensagens.html",
    "mais.html",
    "novidades.html",
    "escolheranuncio.html",
    "ajuda.html",
    "carteira.html",
    "historico.html",
    "dadospessoais.html",
    "enderecos.html",
    "preferencia-notif.html",
    "idioma.html",
    "privacidade.html",
    "senha.html",
    "pagamentos.html",
    "comunidade.html",
    "grupo.html",
    "meuperfil.html",
    "perfil-profissional.html",
    "perfil.html",
    "perfil-cliente.html",
    "perfil-usuario.html",
    "perfil-empresa.html",
    "feed.html",
    "publicacoes.html",
    "interacoes.html",
    "orcamento.html",
    "pagar.html",
    "pedido.html",
    "projeto.html",
    "resultado.html",
    "anunciar.html",
    "anunciar-negocio.html",
    "editar-anuncio.html",
    "avaliar.html",
    "quiz.html",
    "diagnostico.html",
    "diagnostico-avancado.html",
    "tornar-profissional.html",
    "explorar.html",
    "estatistica.html",
    "admin-validacoes.html",
    "negocios.html",
    "acompanhamento-profissional.html",
    "empresas.html",
    "meuempreendimento.html",
    "negocio.html",
    "sobre-doke.html"
  ]);
  const LOGO_SRC = "assets/Imagens/doke-logo.png";
  const TRANSITION_MIN_MS = 320;
  const TRANSITION_FADE_MS = 170;
  const BOOT_HOLD_ATTR = "data-doke-boot-hold";
  const BOOT_HOLD_TIMEOUT_MS = 4500;
  let overlayShownAt = 0;
  let overlayClearTimer = 0;
  let overlayHoldTimer = 0;
  let overlayHoldReleased = false;
  const protectedFiles = new Set([
    "acompanhamento-profissional.html",
    "admin-validacoes.html",
    "ajuda.html",
    "anunciar-negocio.html",
    "anunciar.html",
    "avaliar.html",
    "carteira.html",
    "dadospessoais.html",
    "editar-anuncio.html",
    "enderecos.html",
    "estatistica.html",
    "historico.html",
    "mais.html",
    "meuempreendimento.html",
    "meuperfil.html",
    "mensagens.html",
    "notificacoes.html",
    "orcamento.html",
    "pagamentos.html",
    "pagar.html",
    "pedido.html",
    "pedidos.html",
    "perfil-cliente.html",
    "perfil-empresa.html",
    "perfil-profissional.html",
    "perfil-usuario.html",
    "perfil.html",
    "preferencia-notif.html",
    "privacidade.html",
    "projeto.html",
    "publicacoes.html",
    "senha.html",
    "tornar-profissional.html"
  ]);

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

  function persistLoginMarkers(uid) {
    try {
      const safeUid = String(uid || "").trim();
      if (safeUid) localStorage.setItem("doke_uid", safeUid);
      localStorage.setItem("usuarioLogado", "true");
      localStorage.setItem("doke_auth_verified_at", String(Date.now()));
      sessionStorage.setItem("doke_auth_verified_at", String(Date.now()));
    } catch (_e) {}
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
      return {
        access_token: access,
        expires_at_ms: expiresAtMs,
        uid
      };
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
      return flag === "true" || flag === "1";
    } catch (_e) {
      return false;
    }
  }

  function hasValidStoredSession() {
    try {
      const logoutAt = Number(localStorage.getItem("doke_force_logged_out_at") || sessionStorage.getItem("doke_force_logged_out_at") || 0);
      if (Number.isFinite(logoutAt) && logoutAt > 0 && (Date.now() - logoutAt) < 1000 * 60 * 60 * 24 * 7) return false;
      const stored = getStoredSessionCandidate();
      if (stored && stored.access_token) {
        if (stored.uid) persistLoginMarkers(stored.uid);
        return true;
      }
      return hasWeakTrustedMarkers();
    } catch (_e) {
      return false;
    }
  }

  function toUrl(rawHref) {
    try {
      return new URL(String(rawHref || ""), location.href);
    } catch (_e) {
      return null;
    }
  }

  function isInternalHtmlUrl(url) {
    if (!url || url.origin !== location.origin) return false;
    if (url.hash && `${url.pathname}${url.search}` === `${location.pathname}${location.search}`) return false;
    return String(url.pathname || "").toLowerCase().endsWith(".html");
  }

  function extractInlineNavigationHref(rawOnclick) {
    const source = String(rawOnclick || "").trim();
    if (!source) return "";
    const assignMatch = source.match(/location(?:\.href)?\s*=\s*['"]([^'"]+\.html(?:[^'"]*)?)['"]/i);
    if (assignMatch && assignMatch[1]) return assignMatch[1];
    const callMatch = source.match(/location\.(?:assign|replace)\(\s*['"]([^'"]+\.html(?:[^'"]*)?)['"]\s*\)/i);
    return callMatch && callMatch[1] ? callMatch[1] : "";
  }

  function resolveNavigationUrlFromTarget(target) {
    if (!(target instanceof Element)) return null;
    const anchor = target.closest("a[href]");
    if (anchor instanceof HTMLAnchorElement) {
      if (anchor.hasAttribute("download")) return null;
      const targetAttr = String(anchor.getAttribute("target") || "").trim().toLowerCase();
      if (targetAttr && targetAttr !== "_self") return null;
      const anchorUrl = toUrl(anchor.getAttribute("href"));
      if (isInternalHtmlUrl(anchorUrl)) return anchorUrl;
    }

    const clickable = target.closest("[onclick]");
    if (!(clickable instanceof HTMLElement)) return null;
    const inlineHref = extractInlineNavigationHref(clickable.getAttribute("onclick") || "");
    const inlineUrl = toUrl(inlineHref);
    return isInternalHtmlUrl(inlineUrl) ? inlineUrl : null;
  }

  function markNextHtmlNavigation(url) {
    return;
  }


  function normalizeAppEntryTarget(rawPath) {
    try {
      const u = new URL(String(rawPath || "index.html"), location.href);
      if (u.origin !== location.origin) return "index.html";
      const file = String((u.pathname || "").split("/").pop() || "index.html").toLowerCase();
      if (file !== "index.html" && migratedAppRoutes.has(file)) {
        return `index.html?fromLegacyRoute=1&route=${encodeURIComponent(`${file}${u.search || ""}`)}`;
      }
      return `${u.pathname || ""}${u.search || ""}${u.hash || ""}` || "index.html";
    } catch (_e) {
      return "index.html";
    }
  }

  function maybeRedirectMigratedRouteToApp() {
    try {
      if (isHomePage) return false;
      if (!migratedAppRoutes.has(currentFileName)) return false;
      const params = new URLSearchParams(location.search || '');
      if (params.get('noshell') === '1' || params.get('embed') === '1' || params.get('v2frame') === '1') return false;
      if (params.get('fromLegacyRoute') === '1') return false;
      const target = new URL('index.html', location.href);
      target.searchParams.set('fromLegacyRoute', '1');
      target.searchParams.set('route', `${currentFileName}${location.search || ''}`);
      location.replace(target.toString());
      return true;
    } catch (_e) {
      return false;
    }
  }

  function maybeRedirectProtectedPage() {
    try {
      if (!protectedFiles.has(currentFileName)) return false;
      if (hasValidStoredSession()) return false;
      try { document.documentElement.style.visibility = "hidden"; } catch (_e) {}
      const next = normalizeAppEntryTarget(`${effectiveCurrentTarget || currentFileName || "index.html"}${location.hash || ""}`);
      location.replace(`login.html?noshell=1&next=${encodeURIComponent(next)}`);
      return true;
    } catch (_e) {
      return false;
    }
  }

  function cleanupDevServiceWorker() {
    try {
      if (!/^(localhost|127\.0\.0\.1)$/i.test(String(location.hostname || ""))) return;
      if (!("serviceWorker" in navigator)) return;
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((reg) => {
          try { reg.unregister(); } catch (_e) {}
        });
      }).catch(() => {});
      if ("caches" in window) {
        caches.keys().then((keys) => {
          keys.forEach((key) => {
            try { caches.delete(key); } catch (_e) {}
          });
        }).catch(() => {});
      }
    } catch (_e) {}
  }

  function installStyle() {
    try {
      if (document.getElementById("dokeNavBootStyle")) return;
      const style = document.createElement("style");
      style.id = "dokeNavBootStyle";
      style.textContent = `
        #dokeNavBootOverlay{
          position:fixed;
          inset:0;
          z-index:2147483647;
          opacity:0;
          pointer-events:none;
          display:grid;
          place-items:start center;
          padding-top:32px;
          background:rgba(245,249,253,.68);
          backdrop-filter:blur(6px);
          transition:opacity .17s cubic-bezier(.22,1,.36,1);
        }
        html.${ENTER_CLASS} #dokeNavBootOverlay{ opacity:1; }
        .doke-nav-skeleton-shell{
          display:flex;
          align-items:center;
          gap:12px;
          padding:14px 18px;
          border-radius:999px;
          background:rgba(255,255,255,.92);
          border:1px solid rgba(214,226,238,.96);
          box-shadow:0 18px 40px rgba(18,49,83,.10);
        }
        .doke-nav-skeleton-brand{
          width:38px;
          height:38px;
          border-radius:14px;
          display:grid;
          place-items:center;
          background:linear-gradient(180deg,#ffffff 0%, #f3f8fc 100%);
          border:1px solid rgba(214,226,238,.96);
          overflow:hidden;
          flex:0 0 auto;
        }
        .doke-nav-skeleton-brand img{
          width:26px;
          height:26px;
          object-fit:contain;
          opacity:.9;
        }
        .doke-nav-skeleton-status{
          display:inline-flex;
          align-items:center;
          gap:10px;
          width:max-content;
          color:#23415f;
          font-size:.92rem;
          font-weight:800;
          letter-spacing:.01em;
        }
        .doke-nav-skeleton-status-dot{
          width:10px;
          height:10px;
          border-radius:50%;
          background:#0b7768;
          box-shadow:0 0 0 0 rgba(11,119,104,.28);
          animation:dokeNavPulse 1s ease-out infinite;
        }
        .doke-nav-skeleton-status-line{
          width:128px;
          height:12px;
          border-radius:999px;
          position:relative;
          overflow:hidden;
          background:#dfe8f2;
        }
        .doke-nav-skeleton-status-line::after{
          content:"";
          position:absolute;
          inset:0;
          transform:translateX(-100%);
          background:linear-gradient(90deg,transparent 0%, rgba(255,255,255,.82) 50%, transparent 100%);
          animation:dokeNavBootShimmer 1.18s linear infinite;
        }
        @keyframes dokeNavBootShimmer{
          100%{ transform:translateX(100%); }
        }
        @keyframes dokeNavPulse{
          70%{ box-shadow:0 0 0 10px rgba(11,119,104,0); }
          100%{ box-shadow:0 0 0 0 rgba(11,119,104,0); }
        }
        @media (max-width: 700px){
          #dokeNavBootOverlay{
            padding-top:18px;
          }
          .doke-nav-skeleton-shell{
            padding:12px 14px;
            gap:10px;
          }
          .doke-nav-skeleton-status{
            font-size:.86rem;
          }
          .doke-nav-skeleton-status-line{
            width:92px;
          }
        }
      `;
      document.head.appendChild(style);
      if (!document.getElementById("dokeNavBootOverlay")) {
        const overlay = document.createElement("div");
        overlay.id = "dokeNavBootOverlay";
        overlay.setAttribute("aria-hidden", "true");
        overlay.innerHTML = `
          <div class="doke-nav-skeleton-shell">
            <div class="doke-nav-skeleton-brand">
              <img src="${LOGO_SRC}" alt="Doke">
            </div>
            <div class="doke-nav-skeleton-status" aria-hidden="true">
              <span class="doke-nav-skeleton-status-dot"></span>
              <span>Abrindo pagina</span>
              <span class="doke-nav-skeleton-status-line"></span>
            </div>
          </div>
        `;
        (document.documentElement || document.body).appendChild(overlay);
      }
    } catch (_e) {}
  }

  function shouldBootTransition() {
    try {
      const targetPath = sessionStorage.getItem(NAV_PREBOOT_KEY) || "";
      return !!targetPath && targetPath === currentPath;
    } catch (_e) {
      return false;
    }
  }

  function getBootHoldToken() {
    try {
      const docToken = String(document.documentElement?.getAttribute(BOOT_HOLD_ATTR) || "").trim();
      if (docToken) return docToken;
    } catch (_e) {}
    try {
      return String(document.body?.getAttribute(BOOT_HOLD_ATTR) || "").trim();
    } catch (_e) {
      return "";
    }
  }

  function hasPendingBootHold() {
    return !!getBootHoldToken() && !overlayHoldReleased;
  }

  function releaseBootHold(token) {
    try {
      const currentToken = getBootHoldToken();
      if (token && currentToken && token !== currentToken) return false;
      overlayHoldReleased = true;
      clearTimeout(overlayHoldTimer);
      overlayHoldTimer = 0;
      try { document.documentElement.removeAttribute(BOOT_HOLD_ATTR); } catch (_e) {}
      try { document.body?.removeAttribute(BOOT_HOLD_ATTR); } catch (_e) {}
      finishOverlay();
      return true;
    } catch (_e) {
      return false;
    }
  }

  window.dokeReleaseBootTransition = releaseBootHold;

  function activateOverlay() {
    return;
  }

  function clearOverlay() {
    try {
      clearTimeout(overlayClearTimer);
      overlayClearTimer = 0;
      clearTimeout(overlayHoldTimer);
      overlayHoldTimer = 0;
      overlayHoldReleased = false;
      sessionStorage.removeItem(NAV_PREBOOT_KEY);
      try { document.documentElement.removeAttribute(BOOT_HOLD_ATTR); } catch (_e) {}
      try { document.body?.removeAttribute(BOOT_HOLD_ATTR); } catch (_e) {}
      document.documentElement.classList.remove(ENTER_CLASS, READY_CLASS, "doke-route-pending");
      try {
        const overlay = document.getElementById("dokeNavBootOverlay");
        if (overlay) overlay.remove();
      } catch (_e) {}
    } catch (_e) {}
  }

  function finishOverlay() {
    try {
      if (!document.documentElement.classList.contains(ENTER_CLASS)) return;
      if (hasPendingBootHold()) return;
      const waitMs = Math.max(0, TRANSITION_MIN_MS - (Date.now() - overlayShownAt));
      clearTimeout(overlayClearTimer);
      overlayClearTimer = window.setTimeout(() => {
        try {
          if (!document.documentElement.classList.contains(ENTER_CLASS)) return;
          document.documentElement.classList.add(READY_CLASS);
          window.setTimeout(clearOverlay, TRANSITION_FADE_MS);
        } catch (_e) {}
      }, waitMs);
    } catch (_e) {}
  }

  function forceHomeTop() {
    if (!isHomePage) return;
    try {
      if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    } catch (_e) {}
    try {
      window.scrollTo(0, 0);
    } catch (_e) {}
  }

  cleanupDevServiceWorker();
  try { sessionStorage.removeItem(NAV_PREBOOT_KEY); } catch (_e) {}
  try { document.documentElement.classList.remove(ENTER_CLASS, READY_CLASS, "doke-route-pending"); } catch (_e) {}
  if (maybeRedirectMigratedRouteToApp()) return;
  if (maybeRedirectProtectedPage()) return;

  activateOverlay();
  forceHomeTop();

  document.addEventListener("click", function (ev) {
    if (ev.defaultPrevented) return;
    if (ev.button !== 0) return;
    if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
    const targetUrl = resolveNavigationUrlFromTarget(ev.target);
    if (!targetUrl) return;
    markNextHtmlNavigation(targetUrl);
  }, true);

  document.addEventListener("DOMContentLoaded", function () {
    requestAnimationFrame(forceHomeTop);
  }, { once: true });

  window.addEventListener("pageshow", function (ev) {
    requestAnimationFrame(forceHomeTop);
    if (ev && ev.persisted) finishOverlay();
  });

  window.addEventListener("load", function () {
    requestAnimationFrame(forceHomeTop);
    finishOverlay();
  }, { once: true });

  setTimeout(finishOverlay, 1800);
})();
